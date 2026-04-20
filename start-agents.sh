#!/usr/bin/env bash
# Source .env from root if it exists, otherwise cli/.env
[ -f .env ] && set -a && source .env && set +a
[ -f cli/.env ] && set -a && source cli/.env && set +a

# Kill any existing processes
pkill -f "tsx index.ts" 2>/dev/null
pkill -f "tsx server.ts" 2>/dev/null
sleep 2

echo "Starting seller agents..."
(cd agents/seller-webbuilder && SELLER_PRIVATE_KEY=$SELLER_SECRET_1  npm start) &
(cd agents/seller-copywriter && SELLER_PRIVATE_KEY=$SELLER_SECRET_2  npm start) &
(cd agents/seller-namer      && SELLER_PRIVATE_KEY=$SELLER_SECRET_3  npm start) &
(cd agents/seller-researcher && SELLER_PRIVATE_KEY=$SELLER_SECRET_4  npm start) &
(cd agents/seller-designer   && SELLER_PRIVATE_KEY=$SELLER_SECRET_5  npm start) &
(cd agents/seller-analyst    && SELLER_PRIVATE_KEY=$SELLER_SECRET_6  SELLER_PORT=4507 npm start) &
(cd agents/seller-strategist && SELLER_PRIVATE_KEY=$SELLER_SECRET_7  SELLER_PORT=4508 npm start) &
(cd agents/seller-lawyer     && SELLER_PRIVATE_KEY=$SELLER_SECRET_8  SELLER_PORT=4509 npm start) &
(cd agents/seller-marketer   && SELLER_PRIVATE_KEY=$SELLER_SECRET_9  SELLER_PORT=4510 npm start) &
(cd agents/seller-monitor    && SELLER_PRIVATE_KEY=$SELLER_SECRET_10 SELLER_PORT=4511 npm start) &

echo "Starting validator agents..."
(cd agents/validator && VALIDATOR_PRIVATE_KEY=$VALIDATOR_SECRET_1 VALIDATOR_PORT=4600 npm start) &
(cd agents/validator && VALIDATOR_PRIVATE_KEY=$VALIDATOR_SECRET_2 VALIDATOR_PORT=4601 npm start) &
(cd agents/validator && VALIDATOR_PRIVATE_KEY=$VALIDATOR_SECRET_3 VALIDATOR_PORT=4602 npm start) &

echo "All agents starting..."
sleep 3
echo ""
echo "Now start the buyer:"
echo "  cd agents/buyer && npm start"
