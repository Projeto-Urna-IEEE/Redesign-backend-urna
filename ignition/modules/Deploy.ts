// ignition/modules/Deploy.ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const INITIAL_MESSAGE = "Olá, Blockchain!";

const StorageModule = buildModule("StorageModule", (m) => {
  // Pega o argumento do construtor
  const initialMessage = m.getParameter("initialMessage", INITIAL_MESSAGE);

  // Faz o deploy do contrato "Storage" passando o argumento
  const storage = m.contract("Storage", [initialMessage]);

  return { storage };
});

export default StorageModule;
