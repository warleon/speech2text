# TODO:

- [ ] Enable task retries
- [ ] Enable task interrupt
- [ ] Install a production server that supports flask-sock
- [ ] Make a worker pool for each queue - to enable parallel or concurrent task execution
- [ ] Maybe make the queues be of type ProcessQueue
- [ ] Enable horizontal scaling - networking
- [ ] Enable diarization pipeline - work in progress
- [ ] Enable word level segmentation pipeline - work in progress
- [ ] Hash file content on upload to asign as task_id
- [ ] Show total audio time and total transcriptable time
- [ ] Enable DAG flow execution, add task dependencies
- [ ] Polish UI, make the file set icon responsive
- [ ] Round timestamps to 2 decimals
- [ ] Replace "cpu" for DEVICE env variable and set build ARG
