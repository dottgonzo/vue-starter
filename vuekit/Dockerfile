FROM dottgonzo/nodealpine
COPY ./platforms/browser/www /app/
RUN /bin/sh -c "npm install http-server -g"
RUN /bin/sh -c "cd /app && npm i --production"
# Expose port 8081 from the container to the host
EXPOSE 8081
# Set usr/bin/mongod as the dockerized entry-point application
ENTRYPOINT ["http-server","-p8081"]