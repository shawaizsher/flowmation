#!/bin/bash
# Azure App Service startup script — runs API server + BullMQ worker via PM2
npm install -g pm2 --silent
pm2 start ecosystem.config.js --no-daemon
