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
                    data: dataTemps.sign_count,
                    fill: false,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderWidth: 1
                },
                {
                    label: '头像更新',
                    data: dataTemps.avatar_count,
                    fill: false,
                    borderColor: 'rgba(99, 132, 255, 1)',
                    backgroundColor: 'rgba(99, 132, 255, 0.5)',
                    borderWidth: 1
                },
                {
                    label: '视频更新',
                    data: dataTemps.video_count,
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

// async函数用于定义异步函数，用于处理异步操作
async function getData() {
    // 使用fetch函数获取http://localhost:3000/api/charts的响应
    const response = await fetch('http://localhost:3000/api/charts');
    // 使用response.json()函数将响应转换为json格式
    const data = await response.json();
    // // 使用Array.from()函数将data转换为数组
    const rows = Array.from(data);
    // 定义sign_count、avatar_count、video_count、month_sign、month_avatar、month_video数组
    const month = [];
    const sign_count = [];
    const avatar_count = [];
    const video_count = [];

    // 遍历rows数组，根据row.type的值，将row.count和row.month分别存入对应的数组中
    for (const row of rows) {
        if (row.type === 'sign') {
            sign_count.push(row.count);
            month.push(row.chart_month);
        } else if (row.type === 'avatar') {
            avatar_count.push(row.count);
            // month.push(row.chart_month);
        } else if (row.type === 'video') {
            video_count.push(row.count);
            // month.push(row.chart_month);
        }
    }
    console.log(month);


    return {
        month,
        sign_count,
        avatar_count,
        video_count
    };
}