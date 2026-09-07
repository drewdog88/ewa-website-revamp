#!/bin/sh
export PATH=/usr/local/bin:$PATH
sudo /usr/local/bin/docker-compose -f /volume1/docker/ewa-observability/docker-compose.yml up -d grafana-proxy
sudo /usr/local/bin/docker restart grafana
sudo /usr/local/bin/docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
