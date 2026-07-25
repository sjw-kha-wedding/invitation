#!/usr/bin/env python3
"""모바일 청첩장 빌드 및 로컬 미리보기 도구.

사용법:
  python manage.py build
  python manage.py preview
"""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import sys
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import quote

from wedding_config import WEDDING

try:
    from PIL import Image, ImageOps
except ImportError:
    Image = None
    ImageOps = None

ROOT = Path(__file__).resolve().parent
DIST = ROOT / 'dist'
TEMPLATE = ROOT / 'templates' / 'index.html'
STATIC = ROOT / 'static'
ASSETS = ROOT / 'assets'
PHOTOS = ROOT / 'photos'
SUPPORTED_IMAGES = {'.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg'}
OPTIMIZABLE_IMAGES = {'.jpg', '.jpeg', '.png', '.webp'}


def natural_key(path: Path) -> list[Any]:
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r'(\d+)', path.name)]


def korean_and(name: str) -> str:
    """이름 뒤에 받침 유무에 맞는 '과/와'를 붙입니다."""
    if not name:
        return ''
    last_code = ord(name[-1])
    has_batchim = 0xAC00 <= last_code <= 0xD7A3 and (last_code - 0xAC00) % 28 != 0
    return f'{name}{"과" if has_batchim else "와"}'


def image_files(folder: Path) -> list[Path]:
    if not folder.exists():
        return []
    return sorted(
        [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in SUPPORTED_IMAGES],
        key=natural_key,
    )


def copy_file(source: Path, relative_target: Path) -> str:
    target = DIST / relative_target
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    return relative_target.as_posix()


def format_megabytes(size: int) -> str:
    return f'{size / 1024 / 1024:.1f}MB'


def optimize_image(
    source: Path,
    relative_target: Path,
    *,
    max_edge: int,
    quality: int,
) -> str:
    if Image is None or ImageOps is None:
        raise RuntimeError(
            '사진 최적화에 Pillow가 필요합니다. '
            '먼저 "py -m pip install -r requirements.txt"를 실행해 주세요.'
        )

    target = DIST / relative_target
    target.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(source) as opened:
        if getattr(opened, 'is_animated', False):
            raise ValueError('움직이는 이미지는 WebP 최적화 대상에서 제외합니다.')

        normalized = ImageOps.exif_transpose(opened)
        if normalized.mode in {'RGBA', 'LA'} or 'transparency' in normalized.info:
            rgba = normalized.convert('RGBA')
            prepared = Image.new('RGB', rgba.size, '#ffffff')
            prepared.paste(rgba, mask=rgba.getchannel('A'))
        else:
            prepared = normalized.convert('RGB')

        prepared.thumbnail(
            (max_edge, max_edge),
            Image.Resampling.LANCZOS,
            reducing_gap=3.0,
        )
        prepared.save(
            target,
            format='WEBP',
            quality=quality,
            method=6,
            optimize=True,
        )

    return relative_target.as_posix()


def optimize_or_copy(
    source: Path,
    relative_target: Path,
    *,
    max_edge: int,
    quality: int,
) -> str:
    if source.suffix.lower() in OPTIMIZABLE_IMAGES:
        try:
            return optimize_image(
                source,
                relative_target,
                max_edge=max_edge,
                quality=quality,
            )
        except Exception as error:
            print(f'[경고] {source.name} 최적화 실패, 원본을 사용합니다: {error}')

    fallback_target = relative_target.with_suffix(source.suffix.lower())
    return copy_file(source, fallback_target)


def build_image_data() -> dict[str, Any]:
    source_bytes = 0
    optimized_paths: list[str] = []

    cover_candidates = image_files(PHOTOS / 'cover')
    cover = ''
    if cover_candidates:
        cover_source = cover_candidates[0]
        source_bytes += cover_source.stat().st_size
        cover = optimize_or_copy(
            cover_source,
            Path('images/cover/cover.webp'),
            max_edge=2000,
            quality=85,
        )
        optimized_paths.append(cover)

    gallery = []
    for index, image in enumerate(image_files(PHOTOS / 'gallery'), start=1):
        source_bytes += image.stat().st_size
        file_number = f'{index:02d}'
        full = optimize_or_copy(
            image,
            Path(f'images/gallery/full/{file_number}.webp'),
            # 모바일 전체 화면 감상용입니다. 1280px면 휴대전화 화면에서
            # 충분히 선명하면서 1920px보다 다운로드와 디코딩이 훨씬 빠릅니다.
            max_edge=1280,
            quality=72,
        )
        thumbnail = optimize_or_copy(
            image,
            Path(f'images/gallery/thumb/{file_number}.webp'),
            max_edge=480,
            quality=68,
        )
        optimized_paths.extend([full, thumbnail])
        gallery.append({
            'src': full,
            'thumbnail_src': thumbnail,
            'alt': (
                f"{korean_and(WEDDING['couple']['groom'])} "
                f"{WEDDING['couple']['bride']}의 웨딩 사진 {index}"
            ),
        })

    # 약도는 사용자가 photos/map 폴더에 이미지를 넣은 경우에만 표시합니다.
    # 기본 임시 약도는 생성하지 않습니다.
    map_candidates = image_files(PHOTOS / 'map')
    map_image = ''
    if map_candidates:
        map_image = copy_file(map_candidates[0], Path('images/map') / map_candidates[0].name)

    optimized_bytes = sum(
        (DIST / relative_path).stat().st_size
        for relative_path in set(optimized_paths)
        if (DIST / relative_path).exists()
    )
    if source_bytes:
        saved_percent = max(0, round((1 - optimized_bytes / source_bytes) * 100))
        print(
            '[최적화] '
            f'원본 {format_megabytes(source_bytes)} → '
            f'배포용 {format_megabytes(optimized_bytes)} '
            f'({saved_percent}% 절감)'
        )

    return {
        'cover': cover,
        'cover_alt': (
            f"{korean_and(WEDDING['couple']['groom'])} "
            f"{WEDDING['couple']['bride']}의 웨딩 대표 사진"
        ),
        'gallery': gallery,
        'map_image': map_image,
        'map_is_draft': False,
    }


def derive_links(config: dict[str, Any]) -> None:
    venue = config['venue']
    kakao_place_id = str(venue.get('kakao_place_id', '')).strip()
    if kakao_place_id:
        venue['kakao_directions_url'] = f'https://map.kakao.com/link/to/{quote(kakao_place_id)}'
    else:
        name = quote(str(venue['name']))
        venue['kakao_directions_url'] = (
            f"https://map.kakao.com/link/to/{name},{venue['latitude']},{venue['longitude']}"
        )

    # 네이버는 사용자가 제공한 장소 링크를 기본 연결로 사용합니다.
    # 해당 링크에서 길찾기를 바로 선택할 수 있으며 앱·모바일웹 환경에 따라 연결됩니다.
    venue['naver_directions_url'] = venue['naver_place_url']


def build() -> Path:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    shutil.copytree(STATIC, DIST / 'static')

    config = json.loads(json.dumps(WEDDING, ensure_ascii=False))
    config['images'] = build_image_data()
    derive_links(config)

    site = config['site']
    site_url = str(site.get('url', '')).rstrip('/')
    share_url = str(site.get('share_url', '') or site_url)
    share_image = str(site.get('share_image', '')).lstrip('/')
    og_image = f'{site_url}/{share_image}' if site_url and share_image else ''
    asset_version = str(site.get('asset_version', '1'))
    cover = config['images']['cover']

    template = TEMPLATE.read_text(encoding='utf-8')
    replacements = {
        '{{TITLE}}': html.escape(str(site['title'])),
        '{{DESCRIPTION}}': html.escape(str(site['description'])),
        '{{CANONICAL_URL}}': html.escape(site_url),
        '{{SHARE_URL}}': html.escape(share_url),
        '{{OG_IMAGE}}': html.escape(og_image),
        '{{OG_IMAGE_ALT}}': html.escape(
            f"{config['couple']['groom']} · {config['couple']['bride']} 결혼식 초대"
        ),
        '{{ASSET_VERSION}}': html.escape(asset_version),
    }
    for old, new in replacements.items():
        template = template.replace(old, new)

    (DIST / 'index.html').write_text(template, encoding='utf-8')
    (DIST / '404.html').write_text(template, encoding='utf-8')
    (DIST / 'site-data.js').write_text(
        'window.WEDDING_DATA = ' + json.dumps(config, ensure_ascii=False, indent=2) + ';\n',
        encoding='utf-8',
    )
    (DIST / '.nojekyll').write_text('', encoding='utf-8')

    print(f'[완료] 청첩장을 생성했습니다: {DIST}')
    print(f'[사진] 커버 {1 if cover else 0}장 / 갤러리 {len(config["images"]["gallery"])}장')
    return DIST


def preview(port: int) -> None:
    build()

    class QuietHandler(SimpleHTTPRequestHandler):
        def log_message(self, format: str, *args: object) -> None:
            return

    handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(DIST), **kwargs)
    server = ThreadingHTTPServer(('127.0.0.1', port), handler)
    url = f'http://127.0.0.1:{port}/'

    print(f'[미리보기] {url}')
    print('브라우저가 열리지 않으면 위 주소를 직접 입력하세요.')
    print('종료하려면 이 창에서 Ctrl+C를 누르세요.')
    threading.Timer(0.7, lambda: webbrowser.open(url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n[종료] 미리보기 서버를 닫았습니다.')
    finally:
        server.server_close()


def main() -> int:
    parser = argparse.ArgumentParser(description='모바일 청첩장 빌드 도구')
    subparsers = parser.add_subparsers(dest='command')
    subparsers.add_parser('build', help='dist 폴더에 배포용 파일 생성')
    preview_parser = subparsers.add_parser('preview', help='빌드 후 로컬 미리보기 실행')
    preview_parser.add_argument('--port', type=int, default=8000)

    args = parser.parse_args()
    command = args.command or 'preview'

    if command == 'build':
        build()
        return 0
    if command == 'preview':
        preview(args.port)
        return 0

    parser.print_help()
    return 1


if __name__ == '__main__':
    sys.exit(main())
