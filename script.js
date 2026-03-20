const SHEET_ID = '1os9N1ZIbicQu-F81_xvJ-ruzWptAP8FZT6tut5ZWT44';
const SHEET_NAME = '마스터_DB';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

let allBooks = [];
let currentChannel = 'yes24';

async function init() {
    try {
        const response = await fetch(CSV_URL);
        const text = await response.text();
        const rows = text.split('\n').map(r => r.split('","').map(c => c.replace(/"/g, '')));
        
        // 데이터 가공 (2행부터 / 시트 링크 열 구조 정확히 매칭)
        allBooks = rows.slice(1).map(row => ({
            title: row[0], // A: 도서 제목
            openDate: new Date(row[3]), // D: DB오픈일
            
            // [예스24] G, I, K, M열 (인덱스 주의: A열이 0)
            yes_cur: parseFloat(row[6]),    // G: 현재지수
            yes_day: parseFloat(row[8]),    // I: 작일변화
            yes_week: parseFloat(row[10]),  // K: 7일변화
            yes_month: parseFloat(row[12]), // M: 1달변화
            
            // [알라딘] N, P, R, T열
            ala_cur: parseFloat(row[13]),   // N: 현재지수
            ala_day: parseFloat(row[15]),   // P: 작일변화
            ala_week: parseFloat(row[17]),  // R: 7일변화
            ala_month: parseFloat(row[19]), // T: 1달변화
            
            img: row[20] // U: 이미지 URL
        }));

        switchChannel('yes24');
        document.getElementById('update-time').innerText = `마지막 업데이트: ${new Date().toLocaleString('ko-KR')}`;
    } catch (e) { console.error("데이터 로딩 실패:", e); }
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
    
    // 신간 (출간 1년 이내) 필터 기준일
    const oneYearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    const freshBooks = allBooks.filter(b => b.openDate >= oneYearAgo && b.title);

    // 메뉴별 설정 (열 구조 매칭 완료)
    const configs = [
        // 1번 메뉴는 현재 지수로 정렬 및 표시
        { id: 1, title: '1. 신간 판매지수 Best 10', key: `${prefix}_cur`, sort: 'desc', limit: 10, displayType: 'abs_value' },
        
        { id: 2, title: '2. 작일 대비 급상승 Best 5', key: `${prefix}_day`, sort: 'desc', limit: 5, displayType: 'change_rise' },
        { id: 3, title: '3. 작일 대비 하락 도서 5권', key: `${prefix}_day`, sort: 'asc', limit: 5, displayType: 'change_fall' },
        
        { id: 4, title: '4. 최근 1주일 급상승 Best 5', key: `${prefix}_week`, sort: 'desc', limit: 5, displayType: 'change_rise' },
        { id: 5, title: '5. 최근 1주일 하락 도서 5권', key: `${prefix}_week`, sort: 'asc', limit: 5, displayType: 'change_fall' },
        
        // 6, 7번 메뉴 (데이터 열 매칭 수정완료 - M, T열)
        { id: 6, title: '6. 최근 1달 급상승 Best 5', key: `${prefix}_month`, sort: 'desc', limit: 5, displayType: 'change_rise' },
        { id: 7, title: '7. 최근 1달 하락 도서 5권', key: `${prefix}_month`, sort: 'asc', limit: 5, displayType: 'change_fall' }
    ];

    configs.forEach(conf => {
        // "집계중"(NaN) 제외 및 숫자 데이터만 필터
        let filtered = freshBooks.filter(b => !isNaN(b[conf.key]));
        
        // 상승/하락 조건에 맞게 한 번 더 필터
        if (conf.displayType === 'change_rise') filtered = filtered.filter(b => b[conf.key] > 0);
        if (conf.displayType === 'change_fall') filtered = filtered.filter(b => b[conf.key] < 0);

        // 정렬
        filtered.sort((a, b) => conf.sort === 'desc' ? b[conf.key] - a[conf.key] : a[conf.key] - b[conf.key]);
        const finalData = filtered.slice(0, conf.limit);

        // 데이터가 있을 때만 섹션 생성
        if (finalData.length > 0) {
            const section = document.createElement('section');
            
            // 타이틀 색상 적용 (상승: 레드, 하락: 블루)
            let titleClass = '';
            if(conf.displayType.includes('rise')) titleClass = 'rise';
            if(conf.displayType.includes('fall')) titleClass = 'fall';
            
            section.innerHTML = `<div class="section-title ${titleClass}">${conf.title}</div>`;
            
            const list = document.createElement('div');
            list.className = 'list-wrapper';

            finalData.forEach((b, i) => {
                const rawVal = b[conf.key];
                let displayVal = '';
                let valClass = '';

                if (conf.displayType === 'abs_value') {
                    // 1번 메뉴: 절댓값 표시 (화살표 없음, 컬러 없음)
                    displayVal = rawVal.toLocaleString('ko-KR');
                } else {
                    // 변화량 메뉴: 화살표 및 컬러 적용
                    if (rawVal > 0) {
                        displayVal = `↑ ${rawVal.toLocaleString('ko-KR')}`;
                        valClass = 'val-rise';
                    } else if (rawVal < 0) {
                        displayVal = `↓ ${Math.abs(rawVal).toLocaleString('ko-KR')}`; // 마이너스 떼고 절댓값
                        valClass = 'val-fall';
                    } else {
                        displayVal = '➖'; // 변화 없음
                    }
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
