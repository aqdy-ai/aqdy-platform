import { paymentService } from "../services/payment.service.js";

async function main() {
  const connected = await paymentService.verifyConnection();

  if (!connected) {
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
