(async () => {
  // ============================================================
  // CẤU HÌNH THÀNH PHỐ: đọc từ window.CITY_CONFIG do HTML truyền vào
  // ============================================================
  const CITY = window.CITY_CONFIG;
  if (!CITY || typeof CITY.lat !== 'number' || typeof CITY.lng !== 'number') {
    console.error(
      '[map.js] Thiếu hoặc sai window.CITY_CONFIG. ' +
      'Hãy khai báo { name, slug, lat, lng, zoom } trong HTML trước thẻ <script src="...1tp.js">.'
    );
    return; // dừng hẳn, không chạy phần còn lại
  }
  const CITY_SLUG = CITY.slug;

  const key = "AIzaSyCs8ONbBTXUBLTzc07JCDGvN5uKSu24vjo";
  const mapId = "ec555fdd51a39cce1f5e1f10";

  // Cấu hình Icon và màu sắc Marker
  const categoryConfig = {
    'Nổi bật':          { bg: '#f57c00', border: '#e65100', glyph: '🌟', labelBg: 'rgba(0, 0, 0, 0.75)' },
    'Check-in':         { bg: '#e91e63', border: '#c2185b', glyph: '📸', labelBg: 'rgba(0, 0, 0, 0.75)' },
    'Lịch sử / Văn hóa':{ bg: '#795548', border: '#4e342e', glyph: '🏰', labelBg: 'rgba(0, 0, 0, 0.75)' },
    'Tâm linh':         { bg: '#7b1fa2', border: '#4a148c', glyph: '🛕', labelBg: 'rgba(0, 0, 0, 0.75)' },
    'Ăn uống':          { bg: '#2e7d32', border: '#1b5e20', glyph: '🍜', labelBg: 'rgba(0, 0, 0, 0.75)' },
    'Khách sạn':        { bg: '#0288d1', border: '#01579b', glyph: '🏨', labelBg: 'rgba(0, 0, 0, 0.75)' }
  };

  function normalizeCategories(raw) {
    if (!raw) return ['Nổi bật'];
    const items = raw.split(/[,;]+/);
    const result = new Set();
    items.forEach(item => {
      const s = item.toLowerCase().trim();
      if (s.includes('noi-bat') || s.includes('nổi bật')) result.add('Nổi bật');
      if (s.includes('check-in') || s.includes('checkin') || s.includes('sống ảo')) result.add('Check-in');
      if (s.includes('lich-su') || s.includes('văn hóa') || s.includes('van-hoa') || s.includes('lịch sử')) result.add('Lịch sử / Văn hóa');
      if (s.includes('tam-linh') || s.includes('tâm linh')) result.add('Tâm linh');
      if (s.includes('an-uong') || s.includes('ăn uống') || s.includes('ẩm thực')) result.add('Ăn uống');
      if (s.includes('khach-san') || s.includes('khách sạn') || s.includes('lưu trú')) result.add('Khách sạn');
    });
    return result.size > 0 ? Array.from(result) : ['Nổi bật'];
  }

  // NẠP GOOGLE MAPS API
  (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",Array.from(r)+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Don't invoke "+l+"() multiple times."):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
    key: key,
    v: "beta",
    language: "vi"
  });

  const { Map } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

  const map = new Map(document.getElementById("map"), {
    center: { lat: CITY.lat, lng: CITY.lng },
    zoom: CITY.zoom,
    mapId: mapId,
    streetViewControl: false,
    rotateControl: false,
  });

  // Nút định vị
  const locationBtn = document.createElement("button");
  locationBtn.innerHTML = "📍";
  locationBtn.title = "Vị trí của tôi";
  Object.assign(locationBtn.style, {
    backgroundColor: "#fff", border: "none", outline: "none",
    width: "44px", height: "44px", borderRadius: "50%",
    boxShadow: "0 2px 6px rgba(0,0,0,0.25)", cursor: "pointer",
    marginRight: "10px", marginBottom: "10px", fontSize: "24px",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.2s ease"
  });
  locationBtn.onmouseover = () => locationBtn.style.backgroundColor = "#f8f9fa";
  locationBtn.onmouseout  = () => locationBtn.style.backgroundColor = "#fff";
  locationBtn.addEventListener("click", () => showMyLocation());
  map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(locationBtn);

  const infoWindow = new google.maps.InfoWindow({ disableAutoPan: true });
  let allMarkers = [];
  let currentCategory = 'Tất cả';

  function updateCounter(count) {
    const counterEl = document.getElementById("counter");
    if (counterEl) {
      counterEl.innerHTML = `Tổng số <span id="counter-number">${count}</span> địa điểm`;
    }
  }

  function createMarker(spot) {
    const primaryCat = spot.category.includes('Nổi bật') ? 'Nổi bật' : (spot.category[0] || 'Nổi bật');
    const cfg = categoryConfig[primaryCat] || categoryConfig['Nổi bật'];

    const pin = new PinElement({
      background: cfg.bg,
      borderColor: cfg.border,
      glyphText: (cfg.glyph || '').replace(/&#65039;|&#xFE0F;|\uFE0F/g, ''),
      scale: 1.4
    });

    const imgPin = document.createElement("div");
    imgPin.className = "featured-img-pin";
    imgPin.style.cssText = `
      width: 44px; height: 44px; border-radius: 50%;
      border: 3px solid #f57c00; box-shadow: 0 3px 8px rgba(0,0,0,0.35);
      overflow: hidden; background-color: #fff; display: none;
      transition: transform 0.2s ease;`;
    const imgEl = document.createElement("img");
    imgEl.src = spot.imageUrl;
    imgEl.style.cssText = "width: 100%; height: 100%; object-fit: cover; display: block;";
    imgPin.appendChild(imgEl);

    const container = document.createElement("div");
    container.className = "marker-container";
    container.style.transform = 'translateY(8px)';

    const label = document.createElement("div");
    label.className = "custom-label";
    label.style.backgroundColor = cfg.labelBg;
    label.textContent = spot.title;

    const pinWrapper = document.createElement("div");
    pinWrapper.className = "pin-wrapper-node";
    const pinNode = pin.element || pin;
    pinWrapper.appendChild(pinNode);

    container.appendChild(pinWrapper);
    container.appendChild(imgPin);
    container.appendChild(label);

    if (primaryCat === 'Nổi bật') {
      pinWrapper.style.display = 'none';
      imgPin.style.display = 'block';
    } else {
      pinWrapper.style.display = 'block';
      imgPin.style.display = 'none';
    }

    const marker = new AdvancedMarkerElement({
      position: spot.position,
      title: spot.title,
      content: container
    });

    imgPin.addEventListener("mouseenter", () => { marker.zIndex = 9999; });
    pinWrapper.addEventListener("mouseenter", () => { marker.zIndex = 9999; });
    imgPin.addEventListener("mouseleave", () => { marker.zIndex = 1; });
    pinWrapper.addEventListener("mouseleave", () => { marker.zIndex = 1; });

    marker.category = spot.category;
    marker.pinInstance = pin;
    marker.pinWrapper = pinWrapper;
    marker.imgPinElement = imgPin;
    marker.labelElement = label;

    allMarkers.push(marker);

    marker.addListener("gmp-click", () => {
      marker.zIndex = 10000;
      const directionUrl = `https://www.google.com/maps/dir/?api=1&destination=${spot.position.lat},${spot.position.lng}`;
      const contentHtml = spot.content
        ? `<p style="font-size:13px;margin:0 0 5px 0;color:#555;">${spot.content}</p>`
        : '';
      infoWindow.setContent(`
        <div id="infowindow-content">
          <img src="${spot.imageUrl}" style="width:100%;max-width:180px;max-height:180px;border-radius:4px;margin-bottom:5px;object-fit:cover;">
          <h1 style="font-size:15px;margin:0 0 5px 0;">${spot.title}</h1>
          ${contentHtml}
          <div style="display:flex;flex-direction:column;gap:5px;">
            <a href="${spot.link}" target="_blank" style="font-size:13px;color:#1a73e8;font-weight:bold;">Xem bài viết chi tiết &raquo;</a>
            <a href="${directionUrl}" target="_blank" style="font-size:13px;color:#d93025;font-weight:bold;">📍 Chỉ đường đến đây &raquo;</a>
          </div>
        </div>
      `);
      infoWindow.open({ anchor: marker, map, shouldFocus: false });
      setTimeout(() => {
        const iw = document.querySelector(".gm-style .gm-style-iw");
        if (!iw) return;
        const mapRect = map.getDiv().getBoundingClientRect();
        const iwRect = iw.getBoundingClientRect();
        const top = iwRect.top - mapRect.top;
        if (top < 15) { map.panBy(0, -(15 - top)); }
      }, 50);
    });

    return marker;
  }

  map.addListener("click", () => { infoWindow.close(); });

  function filterAndDisplayMarkers() {
    let visibleCount = 0;
    allMarkers.forEach(m => {
      const isMatch = (currentCategory === 'Tất cả') ||
        (Array.isArray(m.category) && m.category.includes(currentCategory));
      if (isMatch) {
        m.map = map;
        visibleCount++;
        let activeCat = currentCategory;
        if (activeCat === 'Tất cả') {
          activeCat = m.category.includes('Nổi bật') ? 'Nổi bật' : (m.category[0] || 'Nổi bật');
        }
        if (activeCat === 'Nổi bật') {
          if (m.pinWrapper) m.pinWrapper.style.display = 'none';
          if (m.imgPinElement) m.imgPinElement.style.display = 'block';
        } else {
          if (m.imgPinElement) m.imgPinElement.style.display = 'none';
          if (m.pinWrapper) m.pinWrapper.style.display = 'block';
          const cfg = categoryConfig[activeCat] || categoryConfig['Nổi bật'];
          if (m.pinInstance) {
            m.pinInstance.background = cfg.bg;
            m.pinInstance.borderColor = cfg.border;
            m.pinInstance.glyphText = (cfg.glyph || '').replace(/&#65039;|&#xFE0F;|\uFE0F/g, '');
          }
        }
      } else {
        m.map = null;
      }
    });
    updateCounter(visibleCount);
  }

  window.setActive = function(buttonElement, category) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active-button'));
    buttonElement.classList.add('active-button');
    currentCategory = category;
    filterAndDisplayMarkers();
  };

  window.showMyLocation = function() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
        const myPin = new PinElement({ background: "#4285f4", borderColor: "#1a73e8", glyphText: "📍", scale: 1.4 });
        new AdvancedMarkerElement({ map: map, position: pos, title: "Vị trí của bạn", content: myPin.element });
        map.setCenter(pos);
        map.setZoom(15);
      }, () => alert("Vui lòng cho phép truy cập vị trí."));
    }
  };

  // ĐỌC BÀI VIẾT TỪ BLOGGER API
  const bloggerApiUrl = '/feeds/posts/default?alt=json&max-results=500';
  fetch(bloggerApiUrl)
    .then(response => response.json())
    .then(data => {
      const posts = data.feed.entry || [];
      posts.forEach(post => {
        const contentHTML = post.content ? post.content.$t : '';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentHTML;

        const spotEl = tempDiv.querySelector('.geo-spot');
        if (!spotEl) return;

        const lat = parseFloat(spotEl.getAttribute('data-lat'));
        const lng = parseFloat(spotEl.getAttribute('data-lng'));
        if (isNaN(lat) || isNaN(lng)) return;

        const spotProvince = spotEl.getAttribute('data-province') || '';
        if (spotProvince && spotProvince !== CITY_SLUG) return; // Chỉ giữ Hà Nội

        const spotName = spotEl.getAttribute('data-name') || (post.title ? post.title.$t : 'Địa điểm');
        const spotContent = spotEl.getAttribute('data-content') || '';
        const rawCategory = spotEl.getAttribute('data-category') || 'Nổi bật';
        const categoriesArray = normalizeCategories(rawCategory);

        const linkObj = post.link.find(l => l.rel === 'alternate');
        const postUrl = linkObj ? linkObj.href : '#';

        const imageUrl = post.media$thumbnail
          ? post.media$thumbnail.url.replace(/(=|\/)s72.*/, '$1s400')
          : 'https://via.placeholder.com/300x200';

        createMarker({
          title: spotName,
          content: spotContent,
          category: categoriesArray,
          imageUrl: imageUrl,
          link: postUrl,
          position: { lat: lat, lng: lng }
        });
      });
      filterAndDisplayMarkers();
    })
    .catch(error => console.error('Lỗi khi tải dữ liệu địa điểm:', error));
})();
