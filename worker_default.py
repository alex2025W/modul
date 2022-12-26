import os
from rq import Worker, Queue, Connection
import config
if __name__ == '__main__':
	with Connection(config.redis_conn):
		worker = Worker(map(Queue, ['default']))
		worker.work()

