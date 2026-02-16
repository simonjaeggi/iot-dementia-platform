# Setup device provisioning Python env
```python
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install "psycopg[binary]"
pip install pyserial
```

# Load venv if it already exists
```python
source venv/bin/activate
```

# Setup db path in system environment
```bash
export DATABASE_URL=postgresql://myapp:myapp_pw@localhost:5432/myapp_db
```