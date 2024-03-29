# Simple NodeJS server

This is a simple HTTP server used for all kind of testing by myself.

### Create TLS Certificates

> IMPORTANT: This steps are optional and only needed if you like to use your own certificates. By default we use the once which already existing under the folder openssl.

> NOTE: Even if the domain is configured via the domain variable I did not manage to configure the SANs outside the certificate.cnf. Therefore you will need to modify the SANs inside the certificate.cnf file manually if needed.

~~~ bash
# clean up first
rm openssl/cptdev.com*

# Define variables
domain=cptdev.com

# Create CA Key
openssl ecparam -out "openssl/${domain}.ca.key" -name prime256v1 -genkey
#openssl genrsa -out "openssl/${domain}.ca.key" 2048 

# Create CA Certificate
openssl req -x509 -new -nodes -key "openssl/${domain}.ca.key" -sha256 -days 365 -config certificate.cnf -extensions v3_ca -subj "/CN=${domain} CA" -out "openssl/${domain}.ca.crt"

# Create Key for Server Certificate
openssl ecparam -out "openssl/${domain}.srv.key" -name prime256v1 -genkey
#openssl genrsa -out "openssl/${domain}.srv.key" 2048

# Create CSR for Server Ceritifcate
openssl req -new -key "openssl/${domain}.srv.key" -out "openssl/${domain}.srv.csr" -extensions v3_req -config certificate.cnf -subj "/CN=www.${domain}"

# Optional, verify the certificate
openssl req -in "openssl/${domain}.srv.csr" -noout -text

# Sign Server Ceritifcate CSR with CA Certificate Key
openssl x509 -req -in "openssl/${domain}.srv.csr" -CA "openssl/${domain}.ca.crt" -CAkey "openssl/${domain}.ca.key" -CAcreateserial -out "openssl/${domain}.srv.crt" -days 365 -sha256 -extfile certificate.cnf -extensions v3_req

# Verify certificate
openssl x509 -in "openssl/${domain}.srv.crt" -noout -text > srv.crt.txt

# Bundle Server Certificate and CA Certificate chain inside pkcs format.
openssl pkcs12 -export -inkey "openssl/${domain}.srv.key" -in "openssl/${domain}.srv.crt" -certfile "openssl/${domain}.ca.crt" -out "openssl/${domain}.srv.pfx" -password pass:test123!

# Verify certificate
openssl pkcs12 -in "openssl/${domain}.srv.pfx" -info
test123!
~~~

### Test simple Http request.

~~~ bash
screen -S webserver
sudo node server.js red
# [CTRL]+[a]+[d] to detach
screen -r webserver # to reattach
# [CTRL]+[a]+[d] to detach
curl http://localhost/
curl --tlsv1.2 --cacert ./openssl/cptdev.com.ca.crt --resolve red.cptdev.com:443:127.0.0.1 -v https://red.cptdev.com/ # should server 200 OK
curl --tlsv1.2 --cacert ./openssl/cptdev.com.ca.crt --resolve huhu.cptdev.com:443:127.0.0.1 -v https://huhu.cptdev.com/ # should server 200 OK
screen -r webserver # to reattach
# [CTRL]+[a]+[d] to detach
screen -X -S webserver quit # you want to kill] quit
screen -ls

# test via public internet
# Install ngrok
sudo snap install ngrok
screen -S webserver
sudo npm start
# [CTRL]+[a]+[d] to detach
screen -S ngrok
# Create new terminaln CTRL+SHIFT+ö
ngrok http 80 --host-header="localhost:80" # open in new terminal
# [CTRL]+[a]+[d] to detach
curl https://0ae4-108-143-12-226.ngrok-free.app 
screen -X -S webserver quit # you want to kill] quit
screen -X -S ngrok quit # you want to kill] quit
screen -ls
~~~

### Test Blob request

~~~ bash
sudo node server.js red 80 443 cptdazmon cptdazmon test.txt
curl -v http://localhost/blob/ # 200 OK
~~~

## Misc

### Linux

~~~bash
sudo lsof -i :443 # find process using port 443
sudo kill -9 PID # kill process
~~~


### Github

~~~bash
git status
git add .
git commit -m "Azure Blob Storage test"
git push origin master
~~~

