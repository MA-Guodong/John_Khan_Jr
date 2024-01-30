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
        "Cookie": "buvid_fp_plain=undefined; buvid4=89A99599-3637-8AE4-38BC-608777A0F78670328-022062315-Ara1Z35kYaz7Y%2BxY7JjRNA%3D%3D; hit-new-style-dyn=1; i-wanna-go-back=-1; b_ut=5; CURRENT_FNVAL=4048; CURRENT_PID=893ab6a0-cd69-11ed-aa15-3521daab8cec; DedeUserID=3493295516813806; DedeUserID__ckMd5=dede1b4ac66e1815; FEED_LIVE_VERSION=V_SIDE_CARD_REFRESH; buvid3=42F67FD4-3A36-417B-66D9-11185C918C2831240infoc; b_nut=1693917231; _uuid=677496103-2FA3-103E7-CE101-1783CD642D6729768infoc; hit-dyn-v2=1; enable_web_push=DISABLE; header_theme_version=CLOSE; LIVE_BUVID=AUTO8016996140243849; fingerprint=3c23453eae35f77711ed950265ae34d9; rpdid=|(~u|)umk~R0J'u~|JY~|m)l; CURRENT_QUALITY=120; bili_ticket=eyJhbGciOiJIUzI1NiIsImtpZCI6InMwMyIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MDQ4OTI4MTYsImlhdCI6MTcwNDYzMzU1NiwicGx0IjotMX0.eZL1DMl9YnzXzTEFULfUZgpaSad8VVGC0iXRJlbqmjE; bili_ticket_expires=1704892756; SESSDATA=0bde97f6%2C1720358413%2C3848d%2A11CjAEFn3NKGTiPUhKcGXoNprXvH6jNuAbHabqSZS-84CK6yUeyVF-yf9QYHAH7LaWUp4SVm9CZ0FqaE9rZDBDeXJtbHlTYVgwX1ZyVUpQb2wzcVRrR0hHbWlScFY3b1dhVGhJLWRiWXdWV3pDbThob0llYWlxelJfU3JhTHk2cXJOYVFsNDItei13IIEC; bili_jct=3c34d72081b36d62e1e2234bd77ea85b; bsource=search_baidu; buvid_fp=3c23453eae35f77711ed950265ae34d9; sid=5k8ilyjx; PVID=2; bp_video_offset_3493295516813806=884801617039196242; innersign=0; b_lsid=C5D1EFEE_18CF1688BB1; home_feed_column=5; browser_resolution=2048-1134"
        
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

# 该函数接收一行数据并将其插入到 MySQL 数据库的 video 表中。
def write_mysql_Video(row):
    # 使用 log_time 参数创建与 MySQL 数据库的连接
    with UsingMysql(log_time=True) as um:
        # 创建 SQL 语句将数据插入到 Sign 表中
        sql = "INSERT INTO video (video_title, video_url, video_cover, release_time, video_duration) VALUES (%s, %s, %s, %s, %s)"
        # 执行SQL语句并存储结果
        um.cursor.execute(sql, row)

def video_main():

    video_title, video_url, video_cover, release_time, video_duration = get_info()

    video_first_line = read_mysql_Video(cursor)
    if str(video_first_line[1]) != str(video_title):
        # 创建一行数据写入mysql
        row = [video_title, video_url, video_cover, release_time, video_duration]
        # 将这行数据写入mysql
        write_mysql_Video(row)
    else:
        pass

if __name__ == '__main__':
    for i in range(1, 100):
        video_main()
        print(f"第{i}次执行")
    print("执行100次")

    