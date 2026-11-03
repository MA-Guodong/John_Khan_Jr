process.env.NODE_ENV = 'test';

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import type { Express } from 'express';
import type { Database } from '../src/db/client.js';

const { createDatabase } = await import('../src/db/client.js');
const { migrate } = await import('../src/db/schema.js');
const { createApp } = await import('../src/app.js');

let db: Database;
let app: Express;

const videos = [
  { id: 1, title: '苏联测试视频 A', publishedAt: '2020-01-01 10:00:00', duration: 600, cover: 'https://example.com/a.jpg' },
  { id: 2, title: '苏联测试视频 B', publishedAt: '2020-01-11 10:00:00', duration: 1200, cover: null },
  { id: 3, title: '通辽测试 C', publishedAt: '2020-02-05 10:00:00', duration: 1800, cover: null },
  { id: 4, title: '测试 D', publishedAt: '2020-03-01 10:00:00', duration: 2400, cover: null },
  { id: 5, title: '测试 E', publishedAt: '2021-06-01 10:00:00', duration: 3000, cover: null },
];

const signs = [
  { id: 1, content: '第一条签名', postedAt: '2021-01-01 08:00:00' },
  { id: 2, content: '今天更新', postedAt: '2021-01-02 09:30:00' },
  { id: 3, content: null, postedAt: '2022-05-05 21:15:00' },
  { id: 4, content: '第三条签名', postedAt: '2023-07-07 12:00:00' },
];

const avatars = [
  { id: 1, file: 'a.jpg', postedAt: '2021-03-03 10:00:00' },
  { id: 2, file: 'b.jpg', postedAt: '2022-04-04 10:00:00' },
  { id: 3, file: 'c.jpg', postedAt: '2023-05-05 10:00:00' },
];

before(() => {
  db = createDatabase(':memory:');
  migrate(db);

  db.transaction(() => {
    for (const video of videos) {
      db.run(
        'INSERT INTO videos (id, title, url, cover_url, published_at, duration_seconds) VALUES (?, ?, ?, ?, ?, ?)',
        [video.id, video.title, `https://example.com/${video.id}`, video.cover, video.publishedAt, video.duration],
      );
    }
    for (const sign of signs) {
      db.run('INSERT INTO signs (id, content, posted_at) VALUES (?, ?, ?)', [sign.id, sign.content, sign.postedAt]);
    }
    for (const avatar of avatars) {
      db.run('INSERT INTO avatars (id, image_file, posted_at) VALUES (?, ?, ?)', [avatar.id, avatar.file, avatar.postedAt]);
    }
  });

  app = createApp({ db, webDist: '/nonexistent-web-dist', httpLogging: false });
});

after(() => {
  db.close();
});

describe('健康检查', () => {
  it('返回服务与数据库状态', async () => {
    const response = await request(app).get('/api/health').expect(200);
    assert.equal(response.body.status, 'ok');
    assert.equal(response.body.database, 'ok');
  });
});

describe('GET /api/videos', () => {
  it('默认按发布时间倒序返回分页数据', async () => {
    const response = await request(app).get('/api/videos').expect(200);
    assert.equal(response.body.meta.total, 5);
    assert.equal(response.body.meta.page, 1);
    assert.equal(response.body.data[0].title, '测试 E');
    assert.equal(response.body.data[0].durationLabel, '50:00');
  });

  it('支持分页与排序', async () => {
    const response = await request(app).get('/api/videos?page=2&pageSize=2&sort=publishedAt&order=asc').expect(200);
    assert.equal(response.body.meta.totalPages, 3);
    assert.equal(response.body.meta.hasNext, true);
    assert.deepEqual(
      response.body.data.map((item: { id: number }) => item.id),
      [3, 4],
    );
  });

  it('支持按标题搜索', async () => {
    const response = await request(app).get('/api/videos?q=苏联').expect(200);
    assert.equal(response.body.meta.total, 2);
  });

  it('支持按年份筛选', async () => {
    const response = await request(app).get('/api/videos?year=2020').expect(200);
    assert.equal(response.body.meta.total, 4);
  });

  it('拒绝不在白名单内的排序字段', async () => {
    const response = await request(app).get('/api/videos?sort=drop%20table').expect(400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  });

  it('拒绝过大的分页值', async () => {
    const response = await request(app).get('/api/videos?pageSize=999').expect(400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  });
});

describe('GET /api/signs', () => {
  it('返回全部签名并标记空签名', async () => {
    const response = await request(app).get('/api/signs').expect(200);
    assert.equal(response.body.meta.total, 4);
    assert.equal(response.body.data.filter((item: { content: null }) => item.content === null).length, 1);
  });

  it('withContent=true 时过滤空签名', async () => {
    const response = await request(app).get('/api/signs?withContent=true').expect(200);
    assert.equal(response.body.meta.total, 3);
  });

  it('随机签名接口返回一条有内容的签名', async () => {
    const response = await request(app).get('/api/signs/random').expect(200);
    assert.ok(response.body.data.content);
  });
});

describe('GET /api/avatars', () => {
  it('返回带图片地址的头像', async () => {
    const response = await request(app).get('/api/avatars?year=2021').expect(200);
    assert.equal(response.body.meta.total, 1);
    assert.equal(response.body.data[0].imageUrl, '/images/a.jpg');
  });
});

describe('GET /api/stats/overview', () => {
  it('聚合出总量、节奏与图表数据', async () => {
    const response = await request(app).get('/api/stats/overview').expect(200);
    const overview = response.body;

    assert.deepEqual(overview.totals, { videos: 5, signs: 4, avatars: 3, emptySigns: 1 });
    assert.equal(overview.weekday.length, 7);
    assert.equal(overview.heatmap.length, 168);
    assert.equal(overview.monthly[0].month, '2020-01');
    assert.equal(overview.range.firstVideoAt, '2020-01-01 10:00:00');
    assert.equal(overview.range.lastVideoAt, '2021-06-01 10:00:00');
    assert.equal(overview.durations.totalSeconds, 9000);
    assert.equal(overview.durations.longestSeconds, 3000);
    assert.equal(overview.cadence.longestGap?.days, 457);
    assert.equal(overview.latest.videos.length, 5);
    assert.equal(overview.years[0].year, 2020);
  });

  it('提供筛选用年份列表', async () => {
    const response = await request(app).get('/api/stats/filters').expect(200);
    assert.deepEqual(response.body.data.years.videos, [2021, 2020]);
    assert.deepEqual(response.body.data.years.signs, [2023, 2022, 2021]);
  });
});

describe('错误处理', () => {
  it('未知接口返回 404', async () => {
    const response = await request(app).get('/api/unknown').expect(404);
    assert.equal(response.body.error.code, 'NOT_FOUND');
  });
});
