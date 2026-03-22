const SHEET_ID = '1os9N1ZIbicQu-F81_xvJ-ruzWptAP8FZT6tut5ZWT44';
const SHEET_NAME = '마스터_DB';
const JSON_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;

let allBooks = [];
let currentChannel = 'yes24';
let currentPage = 'dashboard';

// --- [핵심] 한국 시간(KST) 기준 스마트 캐시 로직 ---
async function init() {
    const cacheKey = 'book_sales_data';
    const cacheTimeKey = 'book_sales_timestamp';
    
    // 1. 현재 한국(서울) 시간 구하기
    const nowSeoul = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    
    // 2. 저장된 데이터와 수집 시각 확인
    const savedData = localStorage.getItem(cacheKey);
    const lastUpdateTimestamp = localStorage.getItem(cacheTimeKey);

    // 3. 오늘 한국 시간 오전 7시 시점 구하기
    const seoul7AM = new Date(nowSeoul);
    seoul7AM.setHours(7, 0, 0, 0);

    let needFetch = false;

    if (!savedData || !lastUpdateTimestamp) {
        needFetch = true; // 데이터가 아예 없는 경우
    } else {
        // 마지막 수집 시각을 한국 시간으로 변환
        const lastFetchSeoul = new Date(new Date(parseInt(lastUpdateTimestamp)).toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
        
        // 현재 서울이 7시 이후인데, 마지막 수집이 서울 7시 이전이었다면? 새로고침!
        if (nowSeoul > seoul7AM && lastFetchSeoul < seoul7AM) {
            needFetch = true;
        } else {
            needFetch = false;
        }
    }

    if (!needFetch) {
        console.log("🚀 KST 캐시: 서울 시간 기준 저장된 데이터를 사용합니다.");
        allBooks = JSON.parse(savedData);
        render();
        updateTimestamp(true, lastUpdateTimestamp);
    } else {
        console.log("📡 KST 캐시: 한국 시간 오전 7시가 지나 최신 데이터를 가져옵니다.");
        try {
            const response = await fetch(JSON_URL);
            const text = await response.text();
            const jsonData = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
            
            allBooks = jsonData.table.rows.map(row => {
                const c = row.c;
                return {
                    title: c[0] ? String(c[0].v) : "",
                    openDateStr: c[3] ? String(c[3].f || c[3].v) : "", 
                    openDate: c[3] ? parseGoogleDate(c[3].v) : null,
                    yes_cur: parseVal(c[6]), yes_day: parseVal(c[8]), yes_week: parseVal(c[10]), yes_month: parseVal(c[12]),
                    ala_cur: parseVal(c[13]), ala_day: parseVal(c[15]), ala_week: parseVal(c[17]), ala_month: parseVal(c[19]),
                    img: c[20] ? String(c[20].v) : ""
                };
            }).filter(b => b.title && b.title !== "null");

            // 수집한 시각(현재 실제 시간)과 데이터를 저장
            localStorage.setItem(cacheKey, JSON.stringify(allBooks));
            localStorage.setItem(cacheTimeKey, new Date().getTime().toString());

            render();
            updateTimestamp(false, new Date().getTime());
        } catch (e) { 
            console.error("데이터 로드 에러:", e); 
            document.getElementById('update-time').innerText = "데이터 로드 실패";
        }
    }
}

function updateTimestamp(isCached, timestamp) {
    // 화면 표시 시간도 한국 시간으로 고정해서 표시
    const seoulTimeStr = new Date(parseInt(timestamp)).toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'});
    const label = isCached ? "(KST 저장됨)" : "(KST 최신)";
    document.getElementById('update-time').innerText = `최근 업데이트: ${seoulTimeStr} ${label}`;
}

// --- 유틸리티 및 렌더링 함수는 기존과 동일 ---
function parseGoogleDate(d) {
    const m = String(d).match(/Date\((\d+),(\d+),(\d+)\)/);
    return m ? new Date(m[1], m[2], m[3]) : new Date(d);
}

function parseVal(cell) {
    if (!cell || cell.v === null || cell.v === "집계중") return NaN;
    return typeof cell.v === 'number' ? cell.v : Number(String(cell.v).replace(/,/g, ''));
}

function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
}

function showPage(page) {
    currentPage = page;
    document.getElementById('page-title').innerHTML = page === 'dashboard' ? '출판콘텐츠사업단 <span>신간 판매 현황</span>' : '최근도서 <span>판매지수 현황</span>';
    document.getElementById('dashboard-view').style.display = page === 'dashboard' ? 'block' : 'none';
    document.getElementById('stock-view').style.display = page === 'stock' ? 'block' : 'none';
    if(document.getElementById('sidebar').classList.contains('open')) toggleMenu();
    render();
}

function switchChannel(channel) {
    currentChannel = channel;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.innerText.includes(channel === 'yes24' ? '예스' : '알라딘')));
    render();
}

function getStat(val) {
    if (isNaN(val) || val === 0) return { s: '-', c: 'val-no-change' };
    return { s: (val > 0 ? '↑' : '↓') + ' ' + Math.abs(val).toLocaleString(), c: val > 0 ? 'val-rise' : 'val-fall' };
}

function render() {
    const isYes = currentChannel === 'yes24';
    const prefix = isYes ? 'yes' : 'ala';
    const fresh = allBooks.filter(b => b.openDate && (new Date() - b.openDate) < 365*24*60*60*1000);

    if (currentPage === 'dashboard') {
        const view = document.getElementById('dashboard-view');
        view.innerHTML = '';
        const configs = [
            { t: '1. 현재 판매지수 Best 10', k: `${prefix}_cur`, type: 'abs', p: '현재', l: 10 },
            { t: '2. 작일 대비 상승 Best 5', k: `${prefix}_day`, type: 'rise', p: '어제', l: 5 },
            { t: '3. 작일 대비 하락 도서 5권', k: `${prefix}_day`, type: 'fall', p: '어제', l: 5 },
            { t: '4. 최근 1주일 상승 Best 5', k: `${prefix}_week`, type: 'rise', p: '1주일', l: 5 },
            { t: '5. 최근 1주일 하락 도서 5권', k: `${prefix}_week`, type: 'fall', p: '1주일', l: 5 },
            { t: '6. 최근 1달 상승 Best 5', k: `${prefix}_month`, type: 'rise', p: '한달', l: 5 },
            { t: '7. 최근 1달 하락 도서 5권', k: `${prefix}_month`, type: 'fall', p: '한달', l: 5 }
        ];
        
        let lastP = "";
        configs.forEach(conf => {
            let data = fresh.filter(b => !isNaN(b[conf.k]));
            if (conf.type === 'rise') data = data.filter(b => b[conf.k] > 0);
            if (conf.type === 'fall') data = data.filter(b => b[conf.k] < 0);
            data.sort((a,b) => conf.type === 'fall' ? a[conf.k]-b[conf.k] : b[conf.k]-a[conf.k]);
            data = data.slice(0, conf.l);
            
            if (data.length > 0) {
                if (conf.p !== lastP) {
                    view.innerHTML += `<div class="period-divider"><span class="period-badge">${conf.p}</span><div class="period-line"></div></div>`;
                    lastP = conf.p;
                }
                let html = `<section><div class="section-title ${conf.type}">${conf.t}</div>`;
                data.forEach((b, i) => {
                    const res = getStat(b[conf.k]);
                    const valStr = conf.type === 'abs' ? b[conf.k].toLocaleString() : res.s;
                    html += `<div class="book-card"><div class="rank">${i+1}</div><img src="${b.img}" class="book-img" onerror="this.src='https://via.placeholder.com/45x65'"><div class="book-info"><div class="book-title">${b.title}</div><div class="book-val ${conf.type==='abs'?'':res.c}">${valStr}</div></div></div>`;
                });
                view.innerHTML += html + `</section>`;
            }
        });
    } else {
        const view = document.getElementById('stock-view');
        view.innerHTML = '';
        fresh.sort((a,b) => b.openDate - a.openDate).forEach((b, i) => {
            const d = getStat(b[`${prefix}_day`]), w = getStat(b[`${prefix}_week`]), m = getStat(b[`${prefix}_month`]);
            view.innerHTML += `<div class="stock-item"><div class="rank">${i+1}</div><div class="book-info"><div class="stock-title">${b.title}</div><div class="stock-date">${b.openDateStr} 등록</div></div><div class="stock-val">${isNaN(b[`${prefix}_cur`]) ? '-' : b[`${prefix}_cur`].toLocaleString()}</div><div class="stock-change-group"><div class="stock-sub-val ${d.c}">${d.s} (작일)</div><div class="stock-sub-val" style="font-size:0.6rem; color:#999">주 ${w.s} | 월 ${m.s}</div></div></div>`;
        });
    }
}

init();
