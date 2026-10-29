        // 1. CẤU HÌNH
        const TOTAL_PROVINCES = 34; 
        const COOKIE_NAME = "vietnam_travel_map_34";
        const MAX_STATUS = 3;

        // HÀM TỰ ĐỘNG CĂN GIỮA VÀ PHÓNG TO BẢN ĐỒ (CẬP NHẬT PADDING ĐỘNG)
        function autoFitMap() {
            const svg = document.getElementById('vietnam-map');
            const paths = svg.querySelectorAll('path[data-gd-mm-title]');
            if (paths.length === 0) return;

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            paths.forEach(p => {
                const bbox = p.getBBox();
                if (bbox.width > 0 && bbox.height > 0) {
                    minX = Math.min(minX, bbox.x);
                    minY = Math.min(minY, bbox.y);
                    maxX = Math.max(maxX, bbox.x + bbox.width);
                    maxY = Math.max(maxY, bbox.y + bbox.height);
                }
            });

            // Thiết lập padding mặc định cho PC
            let padTop = 20, padRight = 1, padBottom = 20, padLeft = 20;

            // Nếu là thiết bị di động (màn hình <= 768px)
            if (window.innerWidth <= 768) {
                padTop = 5; padRight = 5; padBottom = 5; padLeft = 5;
            }

            // Tính toán viewBox với padding bất đối xứng
            const viewMinX = minX - padLeft;
            const viewMinY = minY - padTop;
            const viewWidth = (maxX + padRight) - viewMinX;
            const viewHeight = (maxY + padBottom) - viewMinY;

            const viewBoxStr = `${viewMinX} ${viewMinY} ${viewWidth} ${viewHeight}`;
            svg.setAttribute('viewBox', viewBoxStr);
        }

        // Lấy dữ liệu từ cookie
        function getVisitedData() {
            const cookieValue = document.cookie.split('; ').find(row => row.startsWith(COOKIE_NAME + '='));
            if (cookieValue) {
                try {
                    return JSON.parse(decodeURIComponent(cookieValue.split('=')[1]));
                } catch (e) {
                    return {};
                }
            }
            return {};
        }

        // Lưu dữ liệu vào cookie (hạn 30 ngày)
        function saveVisitedData(data) {
            const date = new Date();
            date.setTime(date.getTime() + (30 * 24 * 60 * 60 * 1000));
            const expires = "expires=" + date.toUTCString();
            document.cookie = COOKIE_NAME + "=" + encodeURIComponent(JSON.stringify(data)) + ";" + expires + ";path=/";
        }
		
		// HÀM ĐẶT LẠI BẢN ĐỒ
        window.resetMap = function() {
            if (confirm("Bạn có chắc chắn muốn xóa toàn bộ đánh dấu trên bản đồ không?")) {
                visitedData = {}; 
                saveVisitedData(visitedData); 
                applyMapColors(); 
                updateStats();
            }
        };

        // 2. KHỞI TẠO VÀ ĐỒNG BỘ GIAO DIỆN
        let visitedData = getVisitedData(); 

        function updateStats() {
            const count = Object.values(visitedData).filter(status => status > 0).length;
            const percent = ((count / TOTAL_PROVINCES) * 100).toFixed(2);

            document.getElementById('txt-count').innerText = `${count}/${TOTAL_PROVINCES}`;
            document.getElementById('txt-percent').innerText = `${percent} %`;
        }

        function applyMapColors() {
            document.querySelectorAll('path[data-gd-mm-title]').forEach(path => {
                const id = path.getAttribute('id');
                
                // Xóa inline style để CSS hoạt động
                if (path.style.fill) path.style.fill = ''; 
                path.classList.remove('status-1', 'status-2', 'status-3');
                
                if (visitedData[id] && visitedData[id] > 0) {
                    path.classList.add(`status-${visitedData[id]}`);
                }
            });
        }

        // 3. XỬ LÝ SỰ KIỆN CLICK VÀ HOVER TRÊN TỪNG TỈNH
        document.querySelectorAll('path[data-gd-mm-title]').forEach(path => {
            const id = path.getAttribute('id');
            const name = path.getAttribute('data-gd-mm-title');
			const note = path.getAttribute('data-gd-mm-note');

            path.addEventListener('click', function(e) {
                let currentStatus = visitedData[id] || 0;
                currentStatus++;
                if (currentStatus > MAX_STATUS) currentStatus = 0;

                if (currentStatus === 0) {
                    delete visitedData[id]; 
                } else {
                    visitedData[id] = currentStatus;
                }

                saveVisitedData(visitedData);
                applyMapColors();
                updateStats();
            });

            // Hiệu ứng Tooltip
            path.addEventListener('mouseenter', function(e) {
                const tooltip = document.getElementById('tooltip');
                let tooltipHtml = `<div style="font-size: 16px; margin-bottom: 2px;">${name}</div>`;
                if (note) {
                    tooltipHtml += `<div style="font-size: 11px; font-weight: normal; color: #ddd; margin-bottom: 4px;">(${note})</div>`;
                }
                
                // Thêm dòng hướng dẫn click
                tooltipHtml += `<div class="tooltip-hint">Click để đổi màu</div>`;
                
                tooltip.innerHTML = tooltipHtml;
                tooltip.style.opacity = '1';
            });

            path.addEventListener('mousemove', function(e) {
                const tooltip = document.getElementById('tooltip');
                const rect = document.getElementById('map-container').getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                tooltip.style.left = x + 'px';
                tooltip.style.top = y + 'px';
            });

            path.addEventListener('mouseleave', function() {
                document.getElementById('tooltip').style.opacity = '0';
            });
        });

        // 4. CHỨC NĂNG XUẤT ẢNH PNG
        function downloadMap() {
            const mapContainer = document.getElementById('map-container');
            const btn = document.querySelector('.btn-download');
            
            btn.innerHTML = '⏳ Đang tải...';
            btn.disabled = true;
            document.getElementById('tooltip').style.opacity = '0';

            // Lấy số liệu hiện tại
            const countText = document.getElementById('txt-count').innerText;
            const percentText = document.getElementById('txt-percent').innerText;

            // Tạo các thẻ HTML tạm thời để chèn vào ảnh
            const statsDiv = document.createElement('div');
            statsDiv.className = 'export-only export-stats';
            statsDiv.innerHTML = `
                <div class="title">Tôi đã khám phá:</div>
                <div class="stat-line"> <span>${countText}</span> Tỉnh thành</div>
                <div class="stat-line percent"> <span>${percentText}</span> Việt Nam</div>
            `;

            const footerDiv = document.createElement('div');
            footerDiv.className = 'export-only export-footer';
            footerDiv.innerText = "Tạo bản đồ nơi đã đến tại mapdulich.com";

            // Chèn tạm vào khung bản đồ và bật class cho phép hiển thị
            mapContainer.appendChild(statsDiv);
            mapContainer.appendChild(footerDiv);
            mapContainer.classList.add('is-exporting');

            // Đợi 1 nhịp (khoảng 100ms) để trình duyệt render xong HTML mới chụp
            setTimeout(() => {
                html2canvas(mapContainer, {
                    scale: 2, 
                    useCORS: true,
                    backgroundColor: '#ffffff'
                }).then(canvas => {
                    const link = document.createElement('a');
                    link.download = 'mapdulich_ban-do-du-lich.png';
                    link.href = canvas.toDataURL('image/png');
                    link.click();

                    // DỌN DẸP SAU KHI CHỤP XONG
                    btn.innerHTML = '🖼️ Tải Map';
                    btn.disabled = false;
                    mapContainer.removeChild(statsDiv);
                    mapContainer.removeChild(footerDiv);
                    mapContainer.classList.remove('is-exporting');
                }).catch(err => {
                    console.error("Lỗi xuất ảnh: ", err);
                    alert("Có lỗi khi tải ảnh, vui lòng thử lại!");
                    
                    // DỌN DẸP NẾU LỖI
                    btn.innerHTML = '🖼️ Tải Map';
                    btn.disabled = false;
                    mapContainer.removeChild(statsDiv);
                    mapContainer.removeChild(footerDiv);
                    mapContainer.classList.remove('is-exporting');
                });
            }, 100);
        }

        // CHẠY CÁC HÀM KHỞI TẠO
        window.addEventListener('DOMContentLoaded', () => {
            autoFitMap();   // Tự động căn giữa & phóng to
            applyMapColors();
            updateStats();
        });
      // Lắng nghe sự kiện thay đổi kích thước màn hình
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            // Đợi 200ms sau khi ngừng kéo chuột mới tính toán lại để tránh lag
            resizeTimer = setTimeout(() => {
                autoFitMap();
            }, 200);
        });
