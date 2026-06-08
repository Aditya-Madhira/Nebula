import pymssql

server = "nebulaserver.database.windows.net"
user = "CloudSAac267eda@nebulaserver"
password = "Nebs@123"
database = "Nebuladb"

try:
    print(f"Connecting to {server}...")
    conn = pymssql.connect(server=server, user=user, password=password, database=database, autocommit=True)
    print("Success connecting to Nebuladb!")
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
