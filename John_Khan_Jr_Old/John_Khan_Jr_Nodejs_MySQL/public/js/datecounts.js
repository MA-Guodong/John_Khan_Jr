// 获取API返回的时间差数据
fetch("http://localhost:3000/api/charts/datecounts")
    .then((response) => response.json())
    .then((data) => {
        console.log(data);
        // 处理返回的时间差数据
        const dateCounts = data[0].date_counts;
        console.log(dateCounts);

        // 计算出小约翰已经鸽了多少天
        const days = Math.floor(dateCounts / (24 * 60 * 60));
        console.log(days);

        // 计算出小约翰已经鸽了多少小时
        const hours = Math.floor((dateCounts % (24 * 60 * 60)) / (60 * 60));
        console.log(hours);

        // 格式化输出的字符串
        const formattedOutput = `小约翰的视频已经鸽了${days}天${hours}小时`;

        // 将结果显示在页面上
        const daysCountTextElement = document.getElementById("daysCountText");
        daysCountTextElement.textContent = formattedOutput;
    })
    .catch((error) => {
        console.log(error);
    });
