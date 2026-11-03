#!/usr/bin/env bash
# 供宝塔「计划任务」调用的爬虫包装脚本：
#   */30 * * * * /www/wwwroot/khan/python/run_cron.sh >> /www/wwwroot/khan/python/logs/scraper.log 2>&1
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p logs
exec flock -n /tmp/khan-scraper.lock ./venv/bin/python main.py all
