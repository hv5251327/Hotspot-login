#!/bin/bash
# captive-portal-rules.sh
# Firewall configuration for WiFi Captive Portal redirect using iptables

# Network interface connected to hotspot (e.g. wlan0, ap0)
IFACE="wlan0"
PORTAL_IP="192.168.4.1"
PORTAL_PORT="3000"

echo "Configuring captive portal iptables rules for interface $IFACE..."

# Flush existing rules
sudo iptables -t nat -F
sudo iptables -F

# Allow established connections and DNS (UDP 53)
sudo iptables -A INPUT -p udp --dport 53 -j ACCEPT
sudo iptables -A FORWARD -p udp --dport 53 -j ACCEPT

# Allow traffic to the portal itself (HTTP port 3000)
sudo iptables -A INPUT -i $IFACE -p tcp --dport $PORTAL_PORT -j ACCEPT

# Redirect all HTTP (port 80) and HTTPS (port 443) to portal
sudo iptables -t nat -A PREROUTING -i $IFACE -p tcp --dport 80 -j REDIRECT --to-port $PORTAL_PORT
sudo iptables -t nat -A PREROUTING -i $IFACE -p tcp --dport 443 -j REDIRECT --to-port $PORTAL_PORT

# Block all unauthorized forwarding traffic by default
sudo iptables -A FORWARD -i $IFACE -j DROP

echo "✅ Captive portal rules applied. Clients will be redirected to http://$PORTAL_IP:$PORTAL_PORT/login"
