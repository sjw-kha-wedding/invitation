(() => {
  'use strict';

  const config = window.WEDDING_DATA;
  const app = document.getElementById('app');
  const toast = document.getElementById('toast');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const lazyPlaceholder = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  let lazyImageObserver = null;

  if (!config || !app) {
    throw new Error('site-data.js 또는 화면 요소를 불러오지 못했습니다.');
  }

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const readableKoreanText = (value = '') => {
    const phrases = [
      '지상 및 지하',
      '이용하실 수 있습니다.',
      '다소 혼잡할 수 있는 점',
      '너른 양해 부탁드립니다.',
    ];
    return phrases.reduce(
      (text, phrase) => text.replaceAll(phrase, phrase.replaceAll(' ', '&nbsp;')),
      escapeHtml(value),
    );
  };

  const readableTransportText = (value = '') => {
    const protectRoute = (segment) => escapeHtml(segment)
      .replace(/택시\s+(\d+)분/g, '택시&nbsp;$1분')
      .replace(/버스\s+(\d+번)\s+(\d+)분/g, '버스&nbsp;$1&nbsp;$2분');

    const parts = String(value).split(' │ ');
    const first = protectRoute(parts.shift() || '');
    const following = parts.map((part) =>
      `<span class="transport-route-tail">│&nbsp;${protectRoute(part)}</span>`
    ).join(' ');
    return following ? `${first} ${following}` : first;
  };

  const safeUrl = (value = '') => {
    const url = String(value).trim();
    return /^(https?:\/\/|tel:)/i.test(url) ? url : '#';
  };

  const safeCssPosition = (value = '50% 50%') => {
    const parts = String(value).trim().split(/\s+/).filter(Boolean);
    const validPart = /^(?:left|center|right|top|bottom|(?:100|\d{1,2})%)$/i;
    return parts.length >= 1 && parts.length <= 2 && parts.every((part) => validPart.test(part))
      ? parts.join(' ')
      : '50% 50%';
  };

  const backgroundStyle = (value = '') => {
    const url = encodeURI(String(value))
      .replaceAll('#', '%23')
      .replaceAll('?', '%3F')
      .replaceAll('"', '%22')
      .replaceAll("'", '%27')
      .replaceAll('(', '%28')
      .replaceAll(')', '%29');
    return `background-image: url(&quot;${url}&quot;);`;
  };

  const sectionTitle = (eyebrow, title) => `
    <div class="section-heading reveal">
      <span class="eyebrow">${escapeHtml(eyebrow)}</span>
      <h2>${escapeHtml(title)}</h2>
    </div>`;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 1800);
  }

  async function copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      showToast(successMessage);
    }
  }

  function getDateParts(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return { year, month, day };
  }

  function formatDisplayDate(dateString) {
    const { year, month, day } = getDateParts(dateString);
    return `${year}. ${String(month).padStart(2, '0')}. ${String(day).padStart(2, '0')}.`;
  }

  function getDday(dateString) {
    const weddingDate = new Date(`${dateString}T00:00:00+09:00`);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.ceil((weddingDate.getTime() - today.getTime()) / 86400000);
    if (diff > 0) return `D-${diff}`;
    if (diff === 0) return 'D-DAY';
    return `함께한 지 ${Math.abs(diff)}일`;
  }

  function renderCalendar() {
    const { year, month, day } = getDateParts(config.wedding.date);
    const firstDay = new Date(year, month - 1, 1).getDay();
    const lastDate = new Date(year, month, 0).getDate();
    const cells = Array(firstDay).fill(null).concat(Array.from({ length: lastDate }, (_, index) => index + 1));

    return `
      <div class="calendar reveal" aria-label="${year}년 ${month}월 달력">
        <div class="calendar-month">${year}. ${String(month).padStart(2, '0')}</div>
        <div class="calendar-grid weekday-grid">
          ${weekdays.map((weekday) => `<span>${weekday}</span>`).join('')}
        </div>
        <div class="calendar-grid day-grid">
          ${cells.map((cell, index) => {
            const classes = [cell === day ? 'wedding-day' : '', index % 7 === 0 ? 'sunday' : ''].filter(Boolean).join(' ');
            return `<span class="${classes}">${cell ?? ''}</span>`;
          }).join('')}
        </div>
      </div>`;
  }

  function renderGallery() {
    const gallery = config.images.gallery || [];
    if (!gallery.length) {
      return `
        <div class="image-placeholder gallery-placeholder reveal">
          <span>Gallery Photos</span>
          <small>photos/gallery 폴더에 사진을 넣고 Python으로 다시 빌드하세요</small>
        </div>`;
    }

    const configuredCount = Number(config.design?.gallery_initial_count ?? 9);
    const initialCount = Number.isFinite(configuredCount) && configuredCount > 0
      ? Math.floor(configuredCount)
      : 9;
    const hasMore = gallery.length > initialCount;

    return `
      <div class="gallery-grid reveal" aria-label="웨딩 사진 갤러리">
        ${gallery.map((image, index) => {
          const immediate = index < 3;
          const isExtra = index >= initialCount;
          const thumbnailSource = image.thumbnail_src || image.src;
          return `
            <button
              type="button"
              class="gallery-item"
              data-gallery-index="${index}"
              aria-label="${escapeHtml(image.alt || `웨딩 사진 ${index + 1}`)} 보기"
              ${isExtra ? 'hidden data-gallery-extra="true"' : ''}
            >
              <img
                class="gallery-photo protected-photo${immediate ? '' : ' lazy-photo'}"
                src="${immediate ? escapeHtml(thumbnailSource) : lazyPlaceholder}"
                ${immediate ? '' : `data-src="${escapeHtml(thumbnailSource)}"`}
                alt="${escapeHtml(image.alt || `웨딩 사진 ${index + 1}`)}"
                loading="${immediate ? 'eager' : 'lazy'}"
                decoding="async"
                draggable="false"
              />
            </button>`;
        }).join('')}
      </div>
      ${hasMore ? `
        <div class="gallery-actions reveal">
          <button type="button" id="gallery-toggle" class="gallery-toggle" aria-expanded="false">
            <span class="gallery-toggle-label">사진 더보기</span>
            <span class="gallery-toggle-icon" aria-hidden="true">⌄</span>
          </button>
        </div>` : ''}`;
  }

  function transportIcon(title = '') {
    if (title.includes('기차')) return '🚆';
    if (title.includes('버스')) return '🚌';
    return '•';
  }

  function renderTransport() {
    const transport = config.transport;
    const items = transport.items || [];
    if (!items.length) return '';
    return `
      <div class="transport-list reveal">
        ${items.map((item) => `
          <article class="transport-item">
            <div class="transport-heading">
              <strong>${escapeHtml(item.title)}</strong>
            </div>
            <div class="transport-copy">${(item.lines || []).map((line) => `<p>${readableTransportText(line)}</p>`).join('')}</div>
          </article>`).join('')}
      </div>`;
  }

  function renderParking() {
    const parking = config.parking;
    return `
      <article class="parking-card reveal">
        <div class="parking-icon" aria-hidden="true">P</div>
        <div>
          <h3>${escapeHtml(parking.title)}</h3>
          ${(parking.lines || []).map((line) => `<p>${readableKoreanText(line)}</p>`).join('')}
        </div>
      </article>`;
  }


  function renderAccountRows(list) {
    if (!list.length) return '<p class="empty-account">계좌정보를 입력해 주세요.</p>';
    return list.map((account) => {
      const copyValue = `${account.bank} ${account.number}`;
      return `
        <div class="account-row">
          <div>
            <span>${escapeHtml(account.relation)}</span>
            <strong>${escapeHtml(account.bank)} ${escapeHtml(account.number)}</strong>
            <small>예금주 ${escapeHtml(account.holder)}</small>
          </div>
          <button type="button" class="copy-account" data-account="${escapeHtml(copyValue)}">복사</button>
        </div>`;
    }).join('');
  }

  function renderAccounts() {
    if (!config.accounts.show) return '';
    return `
      <section class="section account-section">
        ${sectionTitle('ACCOUNT', '마음 전하실 곳')}
        <p class="section-description reveal">${escapeHtml(config.accounts.message)}</p>
        <div class="account-group reveal">
          <button type="button" class="account-toggle" data-target="groom-accounts">
            <span>신랑 측</span><span class="toggle-symbol">+</span>
          </button>
          <div id="groom-accounts" class="account-list" hidden>${renderAccountRows(config.accounts.groom_side || [])}</div>
        </div>
        <div class="account-group reveal">
          <button type="button" class="account-toggle" data-target="bride-accounts">
            <span>신부 측</span><span class="toggle-symbol">+</span>
          </button>
          <div id="bride-accounts" class="account-list" hidden>${renderAccountRows(config.accounts.bride_side || [])}</div>
        </div>
      </section>`;
  }

  function renderMap() {
    const { images, venue } = config;
    if (!images.map_image) return '';
    return `
      <figure class="map-card reveal">
        <img src="${escapeHtml(images.map_image)}" alt="${escapeHtml(venue.name)} 약도" loading="lazy" decoding="async" draggable="false" />
      </figure>`;
  }

  function renderFooter() {
    const configuredLines = Array.isArray(config.footer?.lines) ? config.footer.lines : [];
    const lines = configuredLines.length
      ? configuredLines
      : [config.footer?.message || ''];
    return `
      <footer>
        <span>THANK YOU</span>
        <div class="footer-lines">
          ${lines.filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join('')}
        </div>
        <small>WEDDING INVITATION</small>
      </footer>`;
  }

  function render() {
    const { couple, wedding, invitation, venue, images, site } = config;
    const hasFamily = couple.groom_family || couple.bride_family;
    const coverPosition = safeCssPosition(config.design?.cover_position || '50% 50%');
    const coverMarkup = images.cover
      ? `<div class="hero-photo protected-photo" role="img" aria-label="${escapeHtml(images.cover_alt)}" draggable="false" style="${backgroundStyle(images.cover)} background-position: ${coverPosition};"></div>`
      : `<div class="image-placeholder cover-placeholder cover-letter" aria-hidden="true">
          <span>${escapeHtml(couple.groom.slice(0, 1))} &amp; ${escapeHtml(couple.bride.slice(0, 1))}</span>
          <small>OUR WEDDING DAY</small>
        </div>`;

    app.innerHTML = `
      <header class="hero">
        <div class="hero-media ${images.cover ? 'has-image' : ''}">
          ${coverMarkup}
          <div class="hero-overlay"></div>
        </div>
        <div class="hero-copy">
          <p class="hero-kicker">WEDDING INVITATION</p>
          <h1>${escapeHtml(couple.groom)}<span class="ampersand">&amp;</span>${escapeHtml(couple.bride)}</h1>
          <div class="hero-rule"></div>
          <p>${escapeHtml(wedding.display_date)}</p>
          <p>${escapeHtml(wedding.display_time)}</p>
          <a class="venue-link" href="${safeUrl(venue.naver_place_url)}" target="_blank" rel="noopener">
            ${escapeHtml(venue.name)}${venue.hall ? ` · ${escapeHtml(venue.hall)}` : ''}
          </a>
        </div>
      </header>

      ${site.draft_notice ? `<div class="draft-notice">${escapeHtml(site.draft_notice)}</div>` : ''}

      <section class="section invitation-section">
        ${sectionTitle('INVITATION', invitation.title)}
        <div class="invitation-copy reveal">${invitation.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}</div>
        ${hasFamily ? `
          <div class="family-lines reveal">
            ${couple.groom_family ? `<p>${escapeHtml(couple.groom_family)} <strong>${escapeHtml(couple.groom)}</strong></p>` : ''}
            ${couple.bride_family ? `<p>${escapeHtml(couple.bride_family)} <strong>${escapeHtml(couple.bride)}</strong></p>` : ''}
          </div>` : ''}
      </section>

      <section class="section calendar-section">
        ${sectionTitle('DATE', wedding.section_title || '예식 안내')}
        <div class="date-summary reveal">
          <p class="date-large">${formatDisplayDate(config.wedding.date)}</p>
          <p>${escapeHtml(wedding.display_date)} ${escapeHtml(wedding.display_time)}</p>
        </div>
        ${renderCalendar()}
        <p class="dday reveal">${escapeHtml(couple.groom)} · ${escapeHtml(couple.bride)}의 결혼식까지 <strong>${getDday(wedding.date)}</strong></p>
      </section>

      ${(images.gallery || []).length ? `
        <section class="section gallery-section">
          <div class="gallery-label reveal">GALLERY</div>
          ${renderGallery()}
        </section>` : ''}

      <section class="section location-section">
        ${sectionTitle('LOCATION', '오시는 길')}
        <div class="venue-summary reveal">
          <h3>${escapeHtml(venue.name)}</h3>
          ${venue.hall ? `<p class="hall-name">${escapeHtml(venue.hall)}</p>` : ''}
          <p>${escapeHtml(venue.address)}</p>
          ${venue.phone || venue.fax ? `
            <div class="venue-contact">
              ${venue.phone ? `<a href="tel:${escapeHtml(venue.phone.replaceAll('-', ''))}">대표전화 ${escapeHtml(venue.phone)}</a>` : ''}
              ${venue.fax ? `<span>FAX ${escapeHtml(venue.fax)}</span>` : ''}
            </div>` : ''}
        </div>

        ${renderMap()}

        <div class="map-buttons reveal">
          <a class="map-button naver naver-directions" href="${safeUrl(venue.naver_directions_url)}" data-fallback-url="${safeUrl(venue.naver_directions_url)}">네이버 길찾기</a>
          <a class="map-button kakao" href="${safeUrl(venue.kakao_directions_url)}" target="_blank" rel="noopener">카카오 길찾기</a>
        </div>

        <button type="button" class="address-copy reveal" data-address="${escapeHtml(venue.address)}">주소 복사</button>
        <div class="guide-label reveal">${escapeHtml(config.transport.draft_label || '')}</div>
        ${renderParking()}
        ${renderTransport()}
      </section>

      ${renderAccounts()}

      <section class="section share-section">
        ${sectionTitle('SHARE', '청첩장 공유')}
        <p class="section-description reveal">아래 버튼을 눌러 현재 청첩장 주소를 복사할 수 있습니다.</p>
        <button type="button" id="copy-url" class="outline-button reveal">청첩장 URL 복사</button>
      </section>

      ${renderFooter()}`;

    document.getElementById('gallery-modal')?.remove();
    if ((images.gallery || []).length) {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="gallery-modal" class="modal" hidden role="dialog" aria-modal="true" aria-label="웨딩 사진 보기">
          <button type="button" class="modal-close" aria-label="사진 닫기">×</button>
          <button type="button" class="modal-nav modal-prev" aria-label="이전 사진">‹</button>
          <div class="modal-stage">
            <div class="modal-viewport">
              <div class="modal-photo protected-photo" role="img" draggable="false"></div>
            </div>
            <div class="modal-counter" aria-live="polite"></div>
            <div class="modal-dots" aria-label="사진 위치"></div>
          </div>
          <button type="button" class="modal-nav modal-next" aria-label="다음 사진">›</button>
        </div>`);
    }
  }

  function loadLazyImage(image) {
    const source = image.dataset.src;
    if (!source) return;
    image.addEventListener('load', () => image.classList.add('is-loaded'), { once: true });
    image.src = source;
    image.removeAttribute('data-src');
    lazyImageObserver?.unobserve(image);
  }

  function observeLazyImages(root = document) {
    const images = root.querySelectorAll('img[data-src]');
    if (!images.length) return;

    if (!('IntersectionObserver' in window)) {
      images.forEach(loadLazyImage);
      return;
    }

    if (!lazyImageObserver) {
      lazyImageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) loadLazyImage(entry.target);
        });
      }, { rootMargin: '240px 0px', threshold: 0.01 });
    }

    images.forEach((image) => {
      if (image.dataset.lazyObserved === 'true') return;
      image.dataset.lazyObserved = 'true';
      lazyImageObserver.observe(image);
    });
  }

  function setupInteractions() {
    document.querySelector('.naver-directions')?.addEventListener('click', (event) => {
      event.preventDefault();
      const button = event.currentTarget;
      const fallbackUrl = button.dataset.fallbackUrl;
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (!isMobile) {
        window.open(fallbackUrl, '_blank', 'noopener');
        return;
      }

      const venue = config.venue;
      const appName = encodeURIComponent(config.site.url || window.location.href.split('#')[0]);
      const destinationName = encodeURIComponent(venue.name);
      const routeUrl = `nmap://route/car?dlat=${venue.latitude}&dlng=${venue.longitude}&dname=${destinationName}&appname=${appName}`;
      const clickedAt = Date.now();
      window.location.href = routeUrl;

      window.setTimeout(() => {
        if (document.visibilityState === 'visible' && Date.now() - clickedAt < 2200) {
          window.location.href = fallbackUrl;
        }
      }, 1400);
    });

    document.querySelector('.address-copy')?.addEventListener('click', (event) => {
      copyText(event.currentTarget.dataset.address, '주소를 복사했습니다.');
    });

    document.getElementById('copy-url')?.addEventListener('click', () => {
      const shareUrl = config.site.share_url || config.site.url || window.location.href.split('#')[0];
      copyText(shareUrl, '청첩장 주소를 복사했습니다.');
    });

    const galleryToggle = document.getElementById('gallery-toggle');
    galleryToggle?.addEventListener('click', () => {
      const extras = document.querySelectorAll('[data-gallery-extra="true"]');
      const expanded = galleryToggle.getAttribute('aria-expanded') === 'true';
      const nextExpanded = !expanded;
      extras.forEach((item) => {
        item.hidden = !nextExpanded;
      });
      galleryToggle.setAttribute('aria-expanded', String(nextExpanded));
      galleryToggle.querySelector('.gallery-toggle-label').textContent = nextExpanded ? '사진 접기' : '사진 더보기';
      galleryToggle.querySelector('.gallery-toggle-icon').textContent = nextExpanded ? '⌃' : '⌄';
      if (nextExpanded) {
        observeLazyImages(document);
      } else {
        document.querySelector('.gallery-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    const gallery = config.images.gallery || [];
    const modal = document.getElementById('gallery-modal');
    const modalPhoto = modal?.querySelector('.modal-photo');
    const modalCounter = modal?.querySelector('.modal-counter');
    const modalDots = modal?.querySelector('.modal-dots');
    let currentGalleryIndex = 0;
    let swipeStartX = null;
    let swipeCurrentX = null;
    let dotScrubPointerId = null;
    let suppressNextDotClick = false;
    let modalImageRequestId = 0;
    const galleryImageCache = new Map();

    if (modalDots && gallery.length) {
      modalDots.innerHTML = gallery.map((_, index) => `
        <button type="button" class="modal-dot" data-dot-index="${index}" aria-label="${index + 1}번째 사진"></button>`).join('');
    }

    const preloadGalleryImage = (index) => {
      if (!gallery.length) return Promise.resolve();
      const normalized = (index + gallery.length) % gallery.length;
      const source = gallery[normalized].src;
      if (galleryImageCache.has(source)) return galleryImageCache.get(source);

      const image = new Image();
      image.decoding = 'async';
      const ready = new Promise((resolve) => {
        image.addEventListener('load', () => {
          const decoded = typeof image.decode === 'function'
            ? image.decode()
            : Promise.resolve();
          decoded.catch(() => {}).finally(resolve);
        }, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
      image.src = source;
      galleryImageCache.set(source, ready);
      return ready;
    };

    const preloadAdjacent = (centerIndex) => {
      if (gallery.length < 2) return;
      const prepare = () => {
        [1, -1].forEach((offset) => {
          preloadGalleryImage(centerIndex + offset);
        });
      };
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(prepare, { timeout: 900 });
      } else {
        window.setTimeout(prepare, 180);
      }
    };

    const updateDots = () => {
      if (!modalDots) return;
      modalDots.querySelectorAll('.modal-dot').forEach((dot, index) => {
        const active = index === currentGalleryIndex;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-current', active ? 'true' : 'false');
      });
    };

    const updateGalleryModal = (index, direction = 0, mode = 'normal') => {
      if (!modal || !modalPhoto || !gallery.length) return;
      currentGalleryIndex = (index + gallery.length) % gallery.length;
      const image = gallery[currentGalleryIndex];
      const previewSource = image.thumbnail_src || image.src;
      const requestId = ++modalImageRequestId;

      modalPhoto.classList.remove('slide-next', 'slide-prev', 'scrub-change', 'is-dragging', 'is-settling');
      modalPhoto.style.removeProperty('transform');
      modalPhoto.style.removeProperty('opacity');
      void modalPhoto.offsetWidth;
      // 그리드에서 이미 받아 둔 작은 사진을 먼저 보여 주어 빈 화면을 없앱니다.
      modalPhoto.style.backgroundImage = `url("${encodeURI(previewSource).replaceAll('"', '%22')}")`;
      modalPhoto.setAttribute('aria-label', image.alt || `웨딩 사진 ${currentGalleryIndex + 1}`);
      if (mode === 'scrub') {
        modalPhoto.classList.add('scrub-change');
      } else if (direction !== 0) {
        modalPhoto.classList.add(direction > 0 ? 'slide-next' : 'slide-prev');
      }
      if (modalCounter) modalCounter.textContent = `${currentGalleryIndex + 1} / ${gallery.length}`;
      updateDots();

      // 현재 사진을 최우선으로 준비합니다. 준비가 끝난 뒤에만 앞뒤 사진을
      // 천천히 받아 모바일 네트워크가 여러 요청에 막히지 않도록 합니다.
      const currentReady = preloadGalleryImage(currentGalleryIndex);
      if (previewSource !== image.src) {
        currentReady.then(() => {
          if (requestId !== modalImageRequestId) return;
          modalPhoto.style.backgroundImage = `url("${encodeURI(image.src).replaceAll('"', '%22')}")`;
        });
      }
      currentReady.then(() => {
        if (requestId !== modalImageRequestId) return;
        preloadAdjacent(currentGalleryIndex);
      });
    };

    const openGalleryModal = (index) => {
      if (!modal || !gallery.length) return;
      updateGalleryModal(index, 0);
      modal.hidden = false;
      document.body.classList.add('modal-open');
      modal.querySelector('.modal-close')?.focus({ preventScroll: true });
    };

    const closeGalleryModal = () => {
      if (!modal) return;
      modalImageRequestId += 1;
      modal.hidden = true;
      document.body.classList.remove('modal-open');
    };

    document.querySelectorAll('.gallery-item').forEach((button) => {
      button.addEventListener('pointerdown', () => {
        preloadGalleryImage(Number(button.dataset.galleryIndex || 0));
      }, { passive: true });
      button.addEventListener('click', () => openGalleryModal(Number(button.dataset.galleryIndex || 0)));
    });

    modal?.querySelector('.modal-close')?.addEventListener('click', closeGalleryModal);
    modal?.querySelector('.modal-prev')?.addEventListener('click', () => updateGalleryModal(currentGalleryIndex - 1, -1));
    modal?.querySelector('.modal-next')?.addEventListener('click', () => updateGalleryModal(currentGalleryIndex + 1, 1));
    const dotIndexAtPosition = (clientX) => {
      if (!modalDots || !gallery.length) return 0;
      const rect = modalDots.getBoundingClientRect();
      const position = Math.min(Math.max(clientX - rect.left, 0), rect.width);
      return Math.min(gallery.length - 1, Math.floor((position / rect.width) * gallery.length));
    };

    const scrubToPosition = (clientX) => {
      const nextIndex = dotIndexAtPosition(clientX);
      if (nextIndex === currentGalleryIndex) return;
      updateGalleryModal(nextIndex, 0, 'scrub');
    };

    modalDots?.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.stopPropagation();
      dotScrubPointerId = event.pointerId;
      suppressNextDotClick = true;
      modalDots.setPointerCapture?.(event.pointerId);
      modalDots.classList.add('is-scrubbing');
      scrubToPosition(event.clientX);
    });

    modalDots?.addEventListener('pointermove', (event) => {
      if (event.pointerId !== dotScrubPointerId) return;
      event.stopPropagation();
      scrubToPosition(event.clientX);
    });

    const finishDotScrub = (event) => {
      if (!modalDots || event.pointerId !== dotScrubPointerId) return;
      event.stopPropagation();
      scrubToPosition(event.clientX);
      modalDots.releasePointerCapture?.(event.pointerId);
      modalDots.classList.remove('is-scrubbing');
      dotScrubPointerId = null;
    };

    modalDots?.addEventListener('pointerup', finishDotScrub);
    modalDots?.addEventListener('pointercancel', (event) => {
      if (event.pointerId !== dotScrubPointerId) return;
      event.stopPropagation();
      modalDots.classList.remove('is-scrubbing');
      dotScrubPointerId = null;
    });

    modalDots?.addEventListener('click', (event) => {
      event.stopPropagation();
      if (suppressNextDotClick) {
        suppressNextDotClick = false;
        event.preventDefault();
        return;
      }
      const dot = event.target.closest('.modal-dot');
      if (!dot) return;
      const nextIndex = Number(dot.dataset.dotIndex || 0);
      if (nextIndex === currentGalleryIndex) return;
      const direction = nextIndex > currentGalleryIndex ? 1 : -1;
      updateGalleryModal(nextIndex, direction);
    });
    modal?.addEventListener('click', (event) => {
      if (event.target === modal) closeGalleryModal();
    });
    modal?.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.modal-dots')) return;
      if (!event.target.closest('.modal-viewport')) return;
      swipeStartX = event.clientX;
      swipeCurrentX = event.clientX;
      modalPhoto?.classList.remove('slide-next', 'slide-prev', 'scrub-change', 'is-settling');
      modalPhoto?.classList.add('is-dragging');
    });
    modal?.addEventListener('pointermove', (event) => {
      if (swipeStartX === null || !modalPhoto) return;
      swipeCurrentX = event.clientX;
      const distance = (swipeCurrentX - swipeStartX) * .58;
      const fade = 1 - Math.min(Math.abs(distance) / 420, .22);
      modalPhoto.style.transform = `translate3d(${distance}px, 0, 0)`;
      modalPhoto.style.opacity = String(fade);
    });
    modal?.addEventListener('pointerup', (event) => {
      if (event.target.closest('.modal-dots')) return;
      if (swipeStartX === null) return;
      const distance = event.clientX - swipeStartX;
      swipeStartX = null;
      swipeCurrentX = null;
      if (!modalPhoto) return;

      modalPhoto.classList.remove('is-dragging');
      modalPhoto.classList.add('is-settling');

      if (Math.abs(distance) < 45) {
        modalPhoto.style.transform = 'translate3d(0, 0, 0)';
        modalPhoto.style.opacity = '1';
        window.setTimeout(() => {
          modalPhoto.classList.remove('is-settling');
          modalPhoto.style.removeProperty('transform');
          modalPhoto.style.removeProperty('opacity');
        }, 180);
        return;
      }

      const direction = distance < 0 ? 1 : -1;
      preloadGalleryImage(currentGalleryIndex + direction);
      modalPhoto.style.transform = `translate3d(${-direction * 70}px, 0, 0)`;
      modalPhoto.style.opacity = '.42';
      window.setTimeout(() => {
        updateGalleryModal(currentGalleryIndex + direction, direction);
      }, 120);
    });
    modal?.addEventListener('pointercancel', () => {
      swipeStartX = null;
      swipeCurrentX = null;
      if (!modalPhoto) return;
      modalPhoto.classList.remove('is-dragging');
      modalPhoto.classList.add('is-settling');
      modalPhoto.style.transform = 'translate3d(0, 0, 0)';
      modalPhoto.style.opacity = '1';
      window.setTimeout(() => {
        modalPhoto.classList.remove('is-settling');
        modalPhoto.style.removeProperty('transform');
        modalPhoto.style.removeProperty('opacity');
      }, 180);
    });
    modal?.addEventListener('dblclick', (event) => event.preventDefault());
    modal?.addEventListener('wheel', (event) => {
      if (event.ctrlKey) event.preventDefault();
    }, { passive: false });
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((eventName) => {
      modal?.addEventListener(eventName, (event) => event.preventDefault(), { passive: false });
    });

    document.addEventListener('keydown', (event) => {
      if (!modal || modal.hidden) return;
      if (event.key === 'Escape') closeGalleryModal();
      if (event.key === 'ArrowLeft') updateGalleryModal(currentGalleryIndex - 1, -1);
      if (event.key === 'ArrowRight') updateGalleryModal(currentGalleryIndex + 1, 1);
    });

    document.querySelectorAll('.account-toggle').forEach((button) => {
      button.addEventListener('click', () => {
        const target = document.getElementById(button.dataset.target);
        const symbol = button.querySelector('.toggle-symbol');
        target.hidden = !target.hidden;
        symbol.textContent = target.hidden ? '+' : '−';
      });
    });

    document.querySelectorAll('.copy-account').forEach((button) => {
      button.addEventListener('click', () => copyText(button.dataset.account, '은행명과 계좌번호를 복사했습니다.'));
    });

    document.querySelectorAll('.protected-photo').forEach((photo) => {
      photo.addEventListener('contextmenu', (event) => event.preventDefault());
      photo.addEventListener('dragstart', (event) => event.preventDefault());
      photo.addEventListener('selectstart', (event) => event.preventDefault());
    });

    observeLazyImages(document);
    setupReveal();
  }

  function setupReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    elements.forEach((element) => observer.observe(element));
  }

  render();
  setupInteractions();
})();
