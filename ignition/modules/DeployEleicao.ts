import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const EleicaoModule = buildModule("EleicaoModule", (m) => {
  const eleicao = m.contract("Eleicao");

  return eleicao;
});

export default EleicaoModule;
