# Backend
The backend is currently deployed to an AWS EC2 Instance. To connect:
1) ssh -L 8888:localhost:8888 -i ./subgen.pem ubuntu@ec2-54-193-102-146.us-west-1.compute.amazonaws.com
2) tmux a
3) node server.js
4) lt --port 4000 --subdomain subgen
5) Disconnect tmux session

Backend URL: https://subgen.localtunnel.me/