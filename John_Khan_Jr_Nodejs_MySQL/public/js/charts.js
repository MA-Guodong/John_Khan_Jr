window.addEventListener('load', setup);

async function setup() {
    const ctx = document.getElementById('myChart').getContext('2d');
    const dataTemps = await getData();
    const myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dataTemps.month,
            datasets: [
                {
                    label: '签名更新',
                    data: dataTemps.sign_count_new,
                    fill: false,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderWidth: 1
                },
                {
                    label: '头像更新',
                    data: dataTemps.avatar_count_new,
                    fill: false,
                    borderColor: 'rgba(99, 132, 255, 1)',
                    backgroundColor: 'rgba(99, 132, 255, 0.5)',
                    borderWidth: 1
                },
                {
                    label: '视频更新',
                    data: dataTemps.video_count_new,
                    fill: false,
                    borderColor: 'rgba(99, 255, 132, 1)',
                    backgroundColor: 'rgba(99, 255, 132, 0.5)',
                    borderWidth: 1
                }
            ]
        },
        options: {}
    });
}

async function getData() {
    const response = await fetch('http://localhost:3000/api/charts');
    const data = await response.json();
    const rows = Array.from(data);
    const month_sign = [];
    const month_avatar = [];
    const month_video = [];
    const sign_count = [];
    const avatar_count = [];
    const video_count = [];

    for (const row of rows) {
        if (row.type === 'sign') {
            sign_count.push(row.count);
            month_sign.push(row.month);
        } else if (row.type === 'avatar') {
            avatar_count.push(row.count);
            month_avatar.push(row.month);
        } else if (row.type === 'video') {
            video_count.push(row.count);
            month_video.push(row.month);
        }
    }

    const month_max = Math.max(month_sign.length, month_avatar.length, month_video.length);

    if (month_max === month_sign.length) {
        month = month_sign.slice();
    } else if (month_max === month_avatar.length) {
        month = month_avatar.slice();
    } else if (month_max === month_video.length) {
        month = month_video.slice();
    }

    const max_length = Math.max(sign_count.length, avatar_count.length, video_count.length);

    const sign_count_new = Array(max_length).fill(0);
    const avatar_count_new = Array(max_length).fill(0);
    const video_count_new = Array(max_length).fill(0);

    for (let i = 0; i < max_length; i++) {
        if (i < sign_count.length) {
            sign_count_new[i + max_length - sign_count.length] = sign_count[i];
        }
        if (i < avatar_count.length) {
            avatar_count_new[i + max_length - avatar_count.length] = avatar_count[i];
        }
        if (i < video_count.length) {
            video_count_new[i + max_length - video_count.length] = video_count[i];
        }
    }

    return {
        month,
        sign_count_new,
        avatar_count_new,
        video_count_new
    };
}