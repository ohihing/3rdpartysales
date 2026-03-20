const SHEET_ID = '1os9N1ZIbicQu-F81_xvJ-ruzWptAP8FZT6tut5ZWT44';
const SHEET_NAME = '마스터_DB';
const JSON_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;

let allBooks = [];
let currentChannel = 'yes24';

// [중요] 구글 특유의 날짜 형식 "Date(2026,2,20)"을 자바스크립트 날짜로 변환
function parseGoogleDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const match = dateStr.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (match) {
        return new Date(match[1], match[2], match[3]);
    }
    return new Date(dateStr);
}

async function init() {
    try {
        const response = await fetch(JSON_URL);
        const text = await response.text();
        
        // JSON 파싱 구간을 더 안전하게 추출
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        const jsonData = JSON.parse(text.substring(start, end + 1));
        const rows = jsonData.table.rows;
        
        allBooks = rows.map(row => {
            const c = row.c;
            return {
                title: c[0] ? String(c[0].v) : "",         // A: 제목
                openDate: c[3] ? parseGoogleDate(c[3].v) : null, // D: 오픈일 (수정됨)
                
                yes_cur: c[6] ? Number(c[6].v) : NaN, 
                yes_day: c[8] ? Number(c[8].v) : NaN,
                yes_week: c[10] ? Number(c[10].v) : NaN,
                yes_month: c[12] ? Number(c[12].v) : NaN,
                
                ala_cur: c[13] ? Number(c[13].v) : NaN,
                ala_day: c[15] ? Number(c[15].v) : NaN,
                ala_week: c[17] ? Number(c[17].v) : NaN,
                ala_month: c[19] ? Number(c[19].v) : NaN,
                
                img: c[20] ? String(c[20].v) : ""          // U: 이미지 URL
            };
        }).filter(b => b.title && b.title !== "null");

        switchChannel('yes24');
        document.getElementById('update-time').innerText = `마지막 업데이트: ${new Date().toLocaleString('ko-KR')}`;
    } catch (e) { 
        console.error("데이터 로딩 실패:", e);
        document.getElementById('update-time').innerText = "데이터 로딩 실패: 콘솔 로그를 확인하세요.";
    }
}

function switchChannel(channel) {
    currentChannel = channel;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(channel === 'yes24' ? '예스' : '알라딘'));
    });
    render();
}

function render() {
    const main = document.getElementById('content-area');
    main.innerHTML = ''; 

    const isYes = currentChannel === 'yes24';
    const prefix = isYes ? 'yes' : 'ala';
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    // 유효한 날짜가 있고, 1년 이내인 신간만 필터링
    const freshBooks = allBooks.filter(b => b.openDate && b.openDate >= oneYearAgo);

    const configs = [
        { id: 1, title: '1. 신간 판매지수 Best 10', key: `${prefix}_cur`, sort: 'desc', limit: 10, displayType: 'abs' },
        { id: 2, title: '2. 작일 대비 급상승 Best 5', key: `${prefix}_day`, sort: 'desc', limit: 5, displayType: 'rise' },
        { id: 3, title: '3. 작일 대비 하락 도서 5권', key: `${prefix}_day`, sort: 'asc', limit: 5, displayType: 'fall' },
        { id: 4, title: '4. 최근 1주일 급상승 Best 5', key: `${prefix}_week`, sort: 'desc', limit: 5, displayType: 'rise' },
        { id: 5, title: '5. 최근 1주일 하락 도서 5권', key: `${prefix}_week`, sort: 'asc', limit: 5, displayType: 'fall' },
        { id: 6, title: '6. 최근 1달 급상승 Best 5', key: `${prefix}_month`, sort: 'desc', limit: 5, displayType: 'rise' },
        { id: 7, title: '7. 최근 1달 하락 도서 5권', key: `${prefix}_month`, sort: 'asc', limit: 5, displayType: 'fall' }
    ];

    configs.forEach(conf => {
        let filtered = freshBooks.filter(b => !isNaN(b[conf.key]));
        
        if (conf.displayType === 'rise') filtered = filtered.filter(b => b[conf.key] > 0);
        if (conf.displayType === 'fall') filtered = filtered.filter(b => b[conf.key] < 0);

        filtered.sort((a, b) => conf.sort === 'desc' ? b[conf.key] - a[conf.key] : a[conf.key] - b[conf.key]);
        const finalData = filtered.slice(0, conf.limit);

        if (finalData.length > 0) {
            const section = document.createElement('section');
            const colorClass = conf.displayType === 'rise' ? 'rise' : (conf.displayType === 'fall' ? 'fall' : '');
            section.innerHTML = `<div class="section-title ${colorClass}">${conf.title}</div>`;
            
            const list = document.createElement('div');
            list.className = 'list-wrapper';

            finalData.forEach((b, i) => {
                const val = b[conf.key];
                let displayVal = "";
                let valClass = "";

                if (conf.displayType === 'abs') {
                    displayVal = val.toLocaleString(); 
                } else {
                    const arrow = val > 0 ? '↑' : '↓';
                    displayVal = `${arrow} ${Math.abs(val).toLocaleString()}`; 
                    valClass = val > 0 ? 'val-rise' : 'val-fall';
                }

                list.innerHTML += `
                    <div class="book-card">
                        <div class="rank">${i + 1}</div>
                        <img class="book-img" src="${b.img || 'https://via.placeholder.com/45x65?text=No+Img'}" onerror="this.src='https://via.placeholder.com/45x65?text=Error'">
                        <div class="book-info">
                            <div class="book-title">${b.title}</div>
                            <div class="book-val ${valClass}">${displayVal}</div>
                        </div>
                    </div>
                `;
            });
            section.appendChild(list);
            main.appendChild(section);
        }
    });
}

init();
