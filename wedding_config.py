"""모바일 청첩장 설정 파일.

대부분의 수정은 이 파일에서만 하면 됩니다.
문자열은 작은따옴표 또는 큰따옴표 안에 입력하세요.
"""

WEDDING = {
    'site': {
        'title': '서재욱 · 김현아 결혼합니다.',
        'description': '2027년 3월 13일 토요일 오후 2시, 로얄파크컨벤션 3층 로얄홀',
        # 새 GitHub Pages 배포 주소
        'url': 'https://sjw-kha-wedding.github.io/invitation/',
        # 공유 서비스의 기존 캐시를 갱신하기 위한 주소입니다.
        'share_url': 'https://sjw-kha-wedding.github.io/invitation/',
        # 커버사진 대신 사용할 별도 공유 미리보기 이미지입니다.
        'share_image': 'static/share-preview.png',
        'asset_version': '3',
        'draft_notice': '',
    },

    'design': {
        # 커버사진의 보이는 위치입니다. 두 번째 숫자를 낮추면 위쪽, 높이면 아래쪽이 더 보입니다.
        # 예: '50% 20%', '50% 50%', '50% 70%'
        'cover_position': '50% 35%',
        # 갤러리에서 처음 보여줄 사진 수입니다. 이후 사진은 '사진 더보기'로 펼칩니다.
        'gallery_initial_count': 9,
    },

    'couple': {
        'groom': '서재욱',
        'bride': '김현아',
        'groom_family': '서주홍 · 송미덕의 아들',
        'bride_family': '김홍서 · 서은수의 딸',
    },

    'wedding': {
        'section_title': '예식 안내',
        'date': '2027-03-13',
        'time': '14:00',
        'display_date': '2027년 3월 13일 토요일',
        'display_time': '오후 2시',
    },

    'invitation': {
        'title': '저희 두 사람, 결혼합니다.',
        'lines': [
            '서로를 아끼고 믿으며',
            '한 길을 걷고자 합니다.',
            '귀한 걸음으로 축복해 주시면',
            '더없는 기쁨으로 간직하겠습니다.',
        ],
    },

    'venue': {
        'name': '로얄파크컨벤션',
        'hall': '3층 로얄홀',
        'address': '서울특별시 용산구 이태원로 29 (용산동1가 8번지)',
        'phone': '02-793-2900',
        'fax': '02-793-2901',
        'latitude': 37.5365,
        'longitude': 126.9771,
        'naver_place_url': 'https://map.naver.com/p/search/%EB%A1%9C%EC%96%84%ED%8C%8C%ED%81%AC%EC%BB%A8%EB%B2%A4%EC%85%98',
        'kakao_place_url': 'https://map.kakao.com/?q=%EB%A1%9C%EC%96%84%ED%8C%8C%ED%81%AC%EC%BB%A8%EB%B2%A4%EC%85%98',
        'kakao_place_id': '',
    },

    'transport': {
        'draft_label': '오시는 길',
        'items': [
            {
                'title': '지하철',
                'lines': [
                    '6호선 삼각지역 12번 출구: 도보 약 3분',
                    '4호선 삼각지역 1번 출구: 도보 약 5분',
                    '1호선 남영역 1번 출구: 도보 약 7분',
                ],
            },
            {
                'title': '마을버스',
                'lines': [
                    '전쟁기념관 하차: 용산03',
                ],
            },
            {
                'title': '간선버스',
                'lines': [
                    '전쟁기념관 하차: 110A, 110B, 421, 740, N72, N75',
                    '삼각지역 하차: 421, N75, 100, 150, 151, 152, 500, 501, 502, 504, 506, 507, 605, 742, 750A, 750B, 752, N15',
                ],
            },
            {
                'title': '자가용',
                'lines': [
                    '한강대교 방면: 서울역 방면으로 오셔서 삼각지역 사거리를 지나 북문으로 우회전 진입',
                    '서울역 방면: 한강대교 방면으로 오셔서 삼각지역 사거리에서 좌회전 후 70m 전방 서문으로 좌회전 진입',
                    '이태원 방면: 삼각지역 사거리 방향으로 오시다가 동문으로 우회전 진입',
                    '마포·공덕 방면: 삼각지 고가차도를 넘어 삼각지역 사거리에서 직진 후 70m 전방 서문으로 좌회전 진입',
                ],
            },
        ],
    },

    'parking': {
        'title': '주차 안내',
        'lines': [
            '전쟁기념관 내 지상 및 지하 주차장을 이용하실 수 있습니다.',
            '지상·지하 주차장에 약 1,000대까지 주차할 수 있습니다.',
            '예식 당일 주차장이 다소 혼잡할 수 있는 점 너른 양해 부탁드립니다.',
        ],
    },

    'accounts': {
        'show': True,
        'message': '축하의 마음을 전해주시는 모든 분께 감사드립니다.',
        'groom_side': [
            {'relation': '신랑', 'bank': '농협', 'number': '302-0022-0456-01', 'holder': '서재욱'},
        ],
        'bride_side': [
            {'relation': '신부', 'bank': '신한은행', 'number': '110-353-548963', 'holder': '김현아'},
        ],
    },

    'footer': {
        'lines': [
            '함께해 주셔서 감사합니다.',
            '서재욱 · 김현아 드림',
        ],
    },
}
