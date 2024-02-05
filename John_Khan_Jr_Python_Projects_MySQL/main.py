#!/usr/bin python3
import time
import requests
from pathlib import Path
from datetime import datetime
from pymysql_comm import UsingMysql, get_connection

cursor = get_connection().cursor()

url = 'https://api.bilibili.com/x/web-interface/card'

def get_info():
    # 定义头部
    headers = {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36"
    }
    # 定义参数
    params = (
        ('mid', '23947287'),
    )
    # 获取响应
    response = requests.get(url = url, params = params, headers = headers).json()

    # 获取签名
    sign_text = response['data']['card']['sign']
    avatar_url = response['data']['card']['face']
    avatar_name = Path(avatar_url)
    file_name = avatar_name.name

    return sign_text, avatar_url, file_name

# 打印签名和头像url
print(get_info())


def read_mysql_Sign(cursor):
    cursor.execute("SELECT * FROM Sign ORDER BY sign_time DESC")
    data = cursor.fetchone()
    # print("-- 单条记录", data)
    return data


def read_mysql_Avatar(cursor):
    cursor.execute("SELECT * FROM Avatar ORDER BY avatar_time DESC")
    data = cursor.fetchone()
    # print("-- 单条记录", data)
    return data


def write_mysql_Sign(row):
    # 该函数接收一行数据并将其插入到 MySQL 数据库的 Sign 表中。
    # 使用 log_time 参数创建与 MySQL 数据库的连接
    with UsingMysql(log_time=True) as um:
        # 创建 SQL 语句将数据插入到 Sign 表中
        sql = "INSERT INTO Sign (sign_time, sign) VALUES (%s, %s)"
        # 执行SQL语句并存储结果
        um.cursor.execute(sql, row)


def write_mysql_Avatar(row):

    with UsingMysql(log_time=True) as um:
        sql_avatar = "INSERT INTO Avatar (avatar_time, img_file_path) VALUES (%s, %s)"
        um.cursor.execute(sql_avatar, row)

# 检查Charts表中是否有当前月份sign & avatar的记录，如果没有则新建一条
def check_and_insert_chart(chart_month, chart_type):
    with UsingMysql(log_time=False) as um:
        query = "SELECT chart_month, type FROM Charts WHERE chart_month = %s AND type = %s"
        um.cursor.execute(query, (chart_month, chart_type))
        result = um.cursor.fetchone()
        if result is None:
            insert_query = "INSERT INTO Charts (chart_month, count, type) VALUES (%s, %s, %s)"
            um.cursor.execute(insert_query, (chart_month, 0, chart_type))


# 更新Charts表中当前月份sign & avatar的记录
def update_chart_count(chart_month, chart_type):
    with UsingMysql(log_time=False) as um:
        update_query = "UPDATE Charts SET count = count + 1 WHERE chart_month = %s AND type = %s"
        um.cursor.execute(update_query, (chart_month, chart_type))


# 函数：下载图片并保存到路径
def download_img(avatar_url, image_path):
    img = requests.get(avatar_url)
    with open(image_path, 'wb') as f:
        f.write(img.content)
        f.close()


def main():
    current_month = datetime.now().strftime("%Y-%m")
    check_and_insert_chart(current_month, 'sign')
    check_and_insert_chart(current_month, 'avatar')
    sign_text, avatar_url, file_name = get_info()
    sign_first_line = read_mysql_Sign(cursor)
    if str(sign_first_line[2]) != str(sign_text):
        # 获取当前时间
        time_update = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        # 创建一行数据写入mysql
        row = [time_update, sign_text]
        # 将这行数据写入mysql
        write_mysql_Sign(row)
        # 更新Charts表中新增的sign记录
        update_chart_count(current_month, 'sign')
        # 休眠1秒
        time.sleep(1)
    else:
        pass

    work_path = "/Users/gd/My_Projects/John_Khan_Jr/John_Khan_Jr/John_Khan_Jr_Nodejs_MySQL/public/"
    avatar_first_line = read_mysql_Avatar(cursor)
    if str(avatar_first_line[2]) != str(file_name):
        # 获取当前时间
        time_update = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        # 创建包含当前时间和头像名称的列表
        row = [time_update, file_name]
        # 将行写入 mysql
        write_mysql_Avatar(row)
        # 获取图片的路径
        image_path = work_path + file_name
        # 从url下载图片
        download_img(avatar_url, image_path)
        # 更新Charts表中新增的avatar记录
        update_chart_count(current_month, 'avatar')
        # 休眠1秒
        time.sleep(1)

    else:
        pass



if __name__ == '__main__':
    main()
