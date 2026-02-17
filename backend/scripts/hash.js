const bcrypt = require("bcrypt");

(async () => {
  const password = process.argv[2];

  if (!password) {
    console.log("Usage: node scripts/hash.js <password>");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  console.log("\nGenerated Hash:\n");
  console.log(hash);
})();
