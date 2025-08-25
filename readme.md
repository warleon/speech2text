# TODO:

- [ ] Enable task retries
- [ ] Enable task interrupt
- [ ] Install a production server that supports flask-sock
- [ ] Make a worker pool for each queue - to enable parallel or concurrent task execution
- [ ] Maybe make the queues be of type ProcessQueue
- [ ] Enable horizontal scaling - networking
- [ ] Show total audio time and total transcriptable time
- [ ] Polish UI, make the file set icon responsive
- [x] Round timestamps to 2 decimals
- [ ] Replace "cpu" for DEVICE env variable and set build ARG
- [ ] Cache all the models weights in the volume to avoid doing network requests
- [ ] fix first request timeout error
- [ ] fix refresh websocket connection error
