# Deployment

For docker based deployment, the docker compose file in this folder can be used. To login to GitLab, a deploy token is needed. 
This can be created under `Project -> Settings -> Repository -> Deploy Tokens`.

1. Authenticate to GitLab on the target machine

```bash
docker login cr.gitlab.switch.ch

# username deploy token username
# password deploy token password
```

2. Navigate to `/04_Deployment`
3. Create the environment files `.env.compose`, `.env.frontend` and `.env.backend` (see `*.example`)
4. Set target version in `docker-compose.yml`
5. Run docker compose
```bash
docker compose -f docker-compose.yml --env-file .env.compose up -d
```