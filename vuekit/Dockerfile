FROM dottgonzo/nodealpine
COPY ./platforms/browser/www/* /app
COPY ./dockerserver/staticserver.js /app
COPY ./dockerserver/package.json /app
RUN /bin/sh -c "cd /app && npm i --production"
