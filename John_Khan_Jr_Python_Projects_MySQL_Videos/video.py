#!/usr/bin python3
import time
import base64
import requests
import urllib.parse

from hashlib import md5
from functools import reduce
from datetime import datetime
from pymysql_comm import UsingMysql
from pymysql_comm import get_connection

cursor = get_connection().cursor()

mixinKeyEncTab = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
    33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
    61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
    36, 20, 34, 44, 52
]

def getMixinKey(orig: str):
    '对 imgKey 和 subKey 进行字符顺序打乱编码'
    return reduce(lambda s, i: s + orig[i], mixinKeyEncTab, '')[:32]

def encWbi(params: dict, img_key: str, sub_key: str):
    '为请求参数进行 wbi 签名'
    mixin_key = getMixinKey(img_key + sub_key)
    curr_time = round(time.time())
    params['wts'] = curr_time                                   # 添加 wts 字段
    params = dict(sorted(params.items()))                       # 按照 key 重排参数
    # 过滤 value 中的 "!'()*" 字符
    params = {
        k : ''.join(filter(lambda chr: chr not in "!'()*", str(v)))
        for k, v 
        in params.items()
    }
    query = urllib.parse.urlencode(params)                      # 序列化参数
    wbi_sign = md5((query + mixin_key).encode()).hexdigest()    # 计算 w_rid
    params['w_rid'] = wbi_sign
    return params

def get_wbi_keys():
    try:
        response = requests.get('https://api.bilibili.com/x/web-interface/nav', headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
        json_data = response.json()
        if 'data' in json_data:
            img_url = json_data['data']['wbi_img']['img_url']
            sub_url = json_data['data']['wbi_img']['sub_url']
            img_key = img_url.rsplit('/', 1)[1].split('.')[0]
            sub_key = sub_url.rsplit('/', 1)[1].split('.')[0]
            return img_key, sub_key
        else:
            raise KeyError('data not found in json response')
    except requests.exceptions.HTTPError as e:
        print(f'HTTP error: {e}')
    except KeyError as e:
        print(f'Error: {e}')

img_key, sub_key = get_wbi_keys()


# 定义一个函数，用于获取签名后的查询参数
def get_query( **parameters: dict):
    """
    获取签名后的查询参数
    """
    # 获取WBI的图片和子密钥
    img_key, sub_key = get_wbi_keys()
    # 对参数进行签名
    signed_params = encWbi(
        params=parameters,
        img_key=img_key,
        sub_key=sub_key
    )
    # 将签名后的参数转换为URL编码
    query = urllib.parse.urlencode(signed_params)
    return query


# 将时间戳解析为固定格式
def getTime(time):  
    return datetime.fromtimestamp(time).strftime("%Y-%m-%d %H:%M:%S")

def get_info():
    # 定义头部
    headers = {
        "User-Agent": "Mozilla/5.0", "Referer": "https://www.bilibili.com",
        "Cookie": "buvid_fp_plain=undefined; buvid4=89A99599-3637-8AE4-38BC-608777A0F78670328-022062315-Ara1Z35kYaz7Y%2BxY7JjRNA%3D%3D; hit-new-style-dyn=1; i-wanna-go-back=-1; b_ut=5; CURRENT_FNVAL=4048; CURRENT_PID=893ab6a0-cd69-11ed-aa15-3521daab8cec; DedeUserID=3493295516813806; DedeUserID__ckMd5=dede1b4ac66e1815; FEED_LIVE_VERSION=V_SIDE_CARD_REFRESH; buvid3=42F67FD4-3A36-417B-66D9-11185C918C2831240infoc; b_nut=1693917231; _uuid=677496103-2FA3-103E7-CE101-1783CD642D6729768infoc; hit-dyn-v2=1; enable_web_push=DISABLE; header_theme_version=CLOSE; LIVE_BUVID=AUTO8016996140243849; rpdid=|(~u|)umk~R0J'u~|JY~|m)l; home_feed_column=5; fingerprint=c08f743fd6ab64b94e9261a310d4938e; browser_resolution=2048-1134; buvid_fp=c08f743fd6ab64b94e9261a310d4938e; bili_ticket=eyJhbGciOiJIUzI1NiIsImtpZCI6InMwMyIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MDcyMDI5MzIsImlhdCI6MTcwNjk0MzY3MiwicGx0IjotMX0.K1Dl1pWS9rdDoA_67C2BH0DYdmQeNAXBJXiJMc-B8yI; bili_ticket_expires=1707202872; SESSDATA=704261ba%2C1722495734%2C17d3e%2A21CjBnHezhgWjtnaIQzy9Wa6S0KSXp3YrT-Cgt6K6Cb2Zpxx3lZrt1ize5h4eOIc6GciwSVjY1WVU5TW56bV83SFFoYzJvY0ZXYld2Yy1oR2kzSTFWVkdBY3lDZFNwZkVpSkNnWW9RbkRKdGtqRnBHY0J4bXF1Skp5Y0hLZ0s0b0VjaUxYVjJfcFFBIIEC; bili_jct=16dba51a85b7e9f91e02653e89536994; sid=6t3ssc7l; CURRENT_QUALITY=116; PVID=2; b_lsid=51ACC76E_18D73F613FD; bp_video_offset_3493295516813806=894228232735293459"
        
        }
    # 定义mid
    query = get_query(mid='23947287', ps=1, pn=1)
    url_getvideo = f'https://api.bilibili.com/x/space/wbi/arc/search?{query}'
    # print(url_getvideo)

    try:
        videoinfo = requests.get(url_getvideo,headers=headers).json() #  获取当前页视频的信息
        # print(videoinfo)
        videoinfo = videoinfo['data']['list']['vlist']
        for li in videoinfo:  # 遍历每一个视频
            video_title = li['title']  # 视频标题
            video_url = 'https://www.bilibili.com/video/' + li['bvid']  # 视频链接
            video_cover = li['pic']  # 视频封面
            release_time = getTime(li['created'])  # 视频发布时间
            video_duration = li['length']  # 视频时长
    
    except Exception as e:
        print(f"An error occurred: {e}")
    return video_title, video_url, video_cover, release_time, video_duration

# 打印签名和头像url
# print(get_info())


def read_mysql_Video(cursor):
    cursor.execute("SELECT * FROM video ORDER BY release_time DESC")
    data = cursor.fetchone()
    # print("-- 单条记录", data)
    return data

# 检查Charts表中是否有当前月份video的记录，如果没有则新建一条
def check_charts():
    # 使用 log_time 参数创建与 MySQL 数据库的连接
    with UsingMysql(log_time=False) as um:
        # 获取当前的年和月
        current_month = datetime.now().strftime("%Y-%m")
        query = "SELECT chart_month, type FROM Charts WHERE chart_month = %s AND type = %s"
        cursor.execute(query, (current_month, 'video'))
        result = cursor.fetchone()
        if result is None:
            insert_query = "INSERT INTO Charts (chart_month, count, type) VALUES (%s, %s, %s)"
            um.cursor.execute(insert_query, (current_month, 0, 'video'))
        else:
            pass


# 更新Charts表中当前月份video的记录
def update_charts():
    with UsingMysql(log_time=False) as um:
        current_month = datetime.now().strftime("%Y-%m")
        update_query = "UPDATE Charts SET count = count + 1 WHERE chart_month = %s AND type = %s"
        um.cursor.execute(update_query, (current_month, 'video'))        
        

# 该函数接收一行数据并将其插入到 MySQL 数据库的 video 表中。
def write_mysql_Video(row):
    # 使用 log_time 参数创建与 MySQL 数据库的连接
    with UsingMysql(log_time=True) as um:
        # 创建 SQL 语句将数据插入到 Video 表中
        sql = "INSERT INTO video (video_title, video_url, video_cover, release_time, video_duration) VALUES (%s, %s, %s, %s, %s)"
        # 执行SQL语句并存储结果
        um.cursor.execute(sql, row)


def video_main():
    # 先检查Charts表中是否有当前月份video的记录
    check_charts()

    video_title, video_url, video_cover, release_time, video_duration = get_info()

    video_first_line = read_mysql_Video(cursor)
    # 判断表中第一行的数据是否和当前的数据相同
    if str(video_first_line[1]) != str(video_title):
        # 创建一行数据写入mysql
        row = [video_title, video_url, video_cover, release_time, video_duration]
        # 将这行数据写入mysql
        write_mysql_Video(row)
        # 更新Charts表中新增的video记录
        update_charts()
    else:
        pass

if __name__ == '__main__':
    video_main()