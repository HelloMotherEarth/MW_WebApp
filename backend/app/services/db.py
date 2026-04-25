import os
from contextlib import contextmanager
from typing import Iterator

import mysql.connector
from dotenv import load_dotenv

load_dotenv()


def get_db_config() -> dict[str, str | int]:
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "3306")),
        "database": os.getenv("DB_NAME", ""),
        "user": os.getenv("DB_USER", ""),
        "password": os.getenv("DB_PASSWORD", ""),
    }


@contextmanager
def db_cursor() -> Iterator[mysql.connector.cursor.MySQLCursor]:
    connection = mysql.connector.connect(**get_db_config())
    cursor = connection.cursor(dictionary=True)
    try:
        yield cursor
    finally:
        cursor.close()
        connection.close()


def check_db_connection() -> tuple[bool, str]:
    try:
        connection = mysql.connector.connect(**get_db_config())
        connection.close()
        return True, "Connection successful"
    except mysql.connector.Error as err:
        return False, str(err)
