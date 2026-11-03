#!/usr/bin python3

import os
from pathlib import Path
import csv
import requests
import time


url = 'https://api.bilibili.com/x/web-interface/card'


# 定义参数
params = (
    ('mid', '23947287'),
)


# 定义头部
headers = {
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36"
}


# 获取响应
response = requests.get(url=url, params=params, headers=headers).json()


# 获取签名
sign_text = response['data']['card']['sign']
avatar_url = response['data']['card']['face']


# 文件名
avatar_name = Path(avatar_url)
file_name = avatar_name.name

# 打印签名和头像url
print(sign_text, avatar_url)
file_path = r'time.csv'


# 写入csv文件
with open(file_path, newline='', encoding='utf-8') as f:
    csv_reader = csv.reader(f)
    first_line = next(csv_reader)
    f.close()

# 判断签名是否更新
if str(first_line[1]) != str(sign_text):
    # 获取当前时间
    time_update = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    # 添加时间和签名到csv文件
    row = [time_update, sign_text]
    with open(file_path, 'r', encoding='utf-8') as readFile:
        rd = csv.reader(readFile)
        lines = list(rd)
        lines.insert(0, row)
    with open(file_path, 'w', newline='', encoding='utf-8') as writeFile:
        wt = csv.writer(writeFile)
        wt.writerows(lines)
    readFile.close()
    writeFile.close()

# 获取头像文件路径
file_path_avatar = r'avatar.csv'

# 写入csv文件
with open(file_path_avatar, newline='', encoding='utf-8') as f:
    csv_reader = csv.reader(f)
    first_line = next(csv_reader)
    f.close()

# 判断头像文件是否更新
if str(first_line[1])!= str(file_name):
    # 获取头像url
    save_path = r'/Users/gd/My_Projects/John_Khan_Jr/John_Khan_Jr_Python_Projects_CSV/images/'
    completeName = os.path.join(save_path, file_name)
    # 下载头像
    response = requests.get(avatar_url)
    file = open(completeName, "wb")
    file.write(response.content)
    file.close()

    # 更新时间
    time_update = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    # 添加时间和头像文件名到csv文件
    row = [time_update, file_name]
    with open(file_path_avatar, 'r', encoding='utf-8') as readFile:
        rd = csv.reader(readFile)
        lines = list(rd)
        lines.insert(0, row)
    with open(file_path_avatar, 'w', newline='', encoding='utf-8') as writeFile:
        wt = csv.writer(writeFile)
        wt.writerows(lines)
    readFile.close()
    writeFile.close()