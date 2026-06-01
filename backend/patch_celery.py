import logging
import threading

if not hasattr(logging, "_acquireLock"):
    logging._lock = threading.RLock()

    def _acquireLock():
        logging._lock.acquire()

    def _releaseLock():
        logging._lock.release()

    logging._acquireLock = _acquireLock
    logging._releaseLock = _releaseLock

from celery.__main__ import main

main()