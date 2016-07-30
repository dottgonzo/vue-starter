FROM dottgonzo/nodealpine
COPY ./platforms/browser/www /app/
COPY ./dockerserver/staticserver.js /app
COPY ./dockerserver/package.json /app
RUN /bin/sh -c "npm install http-server -g"
RUN /bin/sh -c "cd /app && npm i --production"
# Expose port 8081 from the container to the host
EXPOSE 8081