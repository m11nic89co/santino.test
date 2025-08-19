# Деплой на VPS

1) Подготовка сервера (Ubuntu):
```bash
curl -fsSL https://raw.githubusercontent.com/your/repo/main/infra/deploy/server-bootstrap.sh | bash
```
или скопируйте файл `infra/deploy/server-bootstrap.sh` и выполните на сервере.

2) Создайте каталог проекта и переменные:
```bash
export REMOTE_HOST=your.vps.ip
export REMOTE_USER=root
export REMOTE_DIR=/opt/crypto-bot
```

3) Скопируйте .env (секреты) вручную на сервер:
```bash
scp .env $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/.env
```

4) Деплой:
```bash
bash infra/deploy/deploy.sh
```

5) Автозапуск через systemd (опционально):
```bash
scp infra/systemd/crypto-bot.service $REMOTE_USER@$REMOTE_HOST:/etc/systemd/system/crypto-bot.service
ssh $REMOTE_USER@$REMOTE_HOST "sudo systemctl daemon-reload && sudo systemctl enable --now crypto-bot"
```

Примечания:
- .env не отправляется автоматически rsync-ом (исключён). Держите секреты только на сервере.
- Обновление: повторите шаг 4; контейнер перезапустится с новой версией.
