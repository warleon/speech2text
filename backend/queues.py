from redis import Redis
from rq import Queue

rq_connection = Redis(host='rq-server', port=6379, decode_responses=True)

hm_less = "less-than-half-a-minute"
m_less = "less-than-one-minute"
tm_less = "less-than-ten-minutes"
hh_less = "less-than-half-an-hour"
h_less = "less-than-an-hour"
h_more = "more-than-an-hour"

hm_less_queue = Queue(hm_less,connection=rq_connection)
m_less_queue = Queue(m_less,connection=rq_connection)
tm_less_queue = Queue(tm_less,connection=rq_connection)
hh_less_queue = Queue(hh_less,connection=rq_connection)
h_less_queue = Queue(h_less,connection=rq_connection)
h_more_queue = Queue(h_more,connection=rq_connection)