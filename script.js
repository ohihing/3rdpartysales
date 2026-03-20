const SHEET_ID = '1os9N1ZIbicQu-F81_xvJ-ruzWptAP8FZT6tut5ZWT44';
const SHEET_NAME = '마스터_DB';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

let allBooks = [];
let currentChannel = 'yes24';

async function init() {
    const response = await fetch(CSV_URL);
    const text = await response.text();
    const rows = text.split('\n').map(r => r.split('","').map(c => c.replace(/"/g, '')));
    
    // 데이터 가공 (2행부터)
    allBooks = rows.slice(1).map(row => ({
        title: row[0],
        openDate: new Date(row[3]),
        // 예스24 데이터 (G, I, K, M열)
        yes_cur: row[6], yes_day: row[8], yes_week: row[10], yes_month: row[12],
        // 알라딘 데이터 (N, P, R, T열)
        ala_cur: row[13], ala_day: row[15], ala_week: row[17], ala_month: row[19],
        img: row[20] // U열에 이미지 URL이 있다고 가정
    }));

    switchChannel('yes24');
    document.getElementById('update-time').innerText = `마지막 업데이트: ${new Date().toLocaleString('ko-KR')}`;
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
    main.innerHTML = ''; // 초기화

    const isYes = currentChannel === 'yes24';
    const prefix = isYes ? 'yes' : 'ala';
    
    // 1년 이내 신간만 필터
    const books = allBooks.filter(b => b.openDate >= new Date(new Date().setFullYear(new Date().getFullYear() - 1)));

    const configs = [
        { title: '1. 판매지수 Best 10', key: `${prefix}_cur`, sort: 'desc', limit: 10, type: 'normal' },
        { title: '2. 작일 대비 상승 Best 5', key: `${prefix}_day`, sort: 'desc', limit: 5, type: 'rise' },
        { title: '3. 작일 대비 하락 도서 5권', key: `${prefix}_day`, sort: 'asc', limit: 5, type: 'fall' },
        { title: '4. 주간 상승 도서 Best 5', key: `${prefix}_week`, sort: 'desc', limit: 5, type: 'rise' },
        { title: '5. 주간 하락 도서 5권', key: `${prefix}_week`, sort: 'asc', limit: 5, type: 'fall' },
        { title: '6. 월간 상승 도서 Best 5', key: `${prefix}_month`, sort: 'desc', limit: 5, type: 'rise' },
        { title: '7. 월간 하락 도서 5권', key: `${prefix}_month`, sort: 'asc', limit: 5, type: 'fall' }
    ];

    configs.forEach(conf => {
        let filtered = books.filter(b => b[conf.key] !== "집계중" && !isNaN(parseFloat(b[conf.key])));
        
        if (conf.type === 'rise') filtered = filtered.filter(b => parseFloat(b[conf.key]) > 0);
        if (conf.type === 'fall') filtered = filtered.filter(b => parseFloat(b[conf.key]) < 0);

        filtered.sort((a, b) => conf.sort === 'desc' ? b[conf.key] - a[conf.key] : a[conf.key] - b[conf.key]);
        const finalData = filtered.slice(0, conf.limit);

        if (finalData.length > 0) {
            const section = document.createElement('section');
            section.innerHTML = `<div class="section-title ${conf.type}">${conf.title}</div>`;
            const list = document.createElement('div');
            list.className = 'list-wrapper';

            finalData.forEach((b, i) => {
                const val = parseFloat(b[conf.key]);
                const valClass = val > 0 ? 'val-rise' : (val < 0 ? 'val-fall' : '');
                const displayVal = (val > 0 ? '+' : '') + val.toLocaleString();

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
