import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import "dotenv/config";

import ContractArtifact from "../artifacts/contracts/Eleicao.sol/Eleicao.json" assert { type: "json" };

import ContractDeployment from "../ignition/deployments/chain-31337/deployed_addresses.json" assert { type: "json" };

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const RPC_URL = process.env.RPC_URL;
const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY;

if (!SERVER_PRIVATE_KEY || !RPC_URL) {
  throw new Error("SERVER_PRIVATE_KEY ou RPC_URL não definidos no .env");
}

const provider = new ethers.JsonRpcProvider(RPC_URL);

const signer = new ethers.Wallet(SERVER_PRIVATE_KEY, provider);

const contractAddress = ContractDeployment["EleicaoModule#Eleicao"];

console.log(`Servidor conectado ao contrato Storage em: ${contractAddress}`);

const eleicaoContract = new ethers.Contract(
  contractAddress,
  ContractArtifact.abi,
  signer
);

console.log(`Servidor conectado ao contrato Storage em: ${contractAddress}`);

app.get("/eleicao/estado", async (req, res) => {
  try {
    const estadoBigInt = await eleicaoContract.currentElectionState();
    const estadoNum = Number(estadoBigInt);
    res.json({ estado: estadoNum });
  } catch (error: any) {
    console.error("ERRO DETALHADO:", error.message);
    res
      .status(500)
      .json({ success: false, error: "Erro ao buscar estado da eleição." });
  }
});

// --- ROTAS DE LEITURA (GET) ---
app.get("/eleicao/periodo", async (req, res) => {
  try {
    const inicio = await eleicaoContract.votingStartTime();
    const fim = await eleicaoContract.votingEndTime();

    res.json({
      success: true,
      // Convertemos o timestamp (BigInt) para um número antes de enviar
      votingStartTime: Number(inicio),
      votingEndTime: Number(fim),
    });
  } catch (error: any) {
    console.error("ERRO DETALHADO:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/eleicao/vencedor", async (req, res) => {
  try {
    const winner = await eleicaoContract.winner();
    res.json({ success: true, id: Number(winner[0]), name: winner[1], voteCount: Number(winner[2]) });
  } catch (error: any) {
    console.error("ERRO DETALHADO:", error.message);
    res
      .status(500)
      .json({ success: false, error: "Erro ao buscar vencedor da eleição." });
  }
});

app.get("/eleicao/candidato", async (req, res) => {
  try {
    const id = Number(req.query.id);
    const votes = await eleicaoContract.getVotesCount(id);
    res.json({ success: true, voteCount: Number(votes) });
  } catch (error: any) {
    console.error("ERRO DETALHADO:", error.message);
    res
      .status(500)
      .json({ success: false, error: "Erro ao buscar votos do candidato." });
  }
});

// --- ROTAS DE ADMIN (POST) ---
// Todas estas rotas exigem que a carteira do servidor seja a "owner"

// --- ADMIN: Mudança de Estado ---
app.post("/eleicao/admin/abrir-registro", async (req, res) => {
  try {
    const tx = await eleicaoContract.openRegistering();
    await tx.wait(); // Espera a transação ser minerada
    res
      .status(200)
      .json({ success: true, txHash: tx.hash, message: "Registro aberto." });
  } catch (error: any) {
    console.error("ERRO DETALHADO:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/eleicao/admin/fechar-registro", async (req, res) => {
  try {
    const tx = await eleicaoContract.closeRegistering();
    await tx.wait();
    res
      .status(200)
      .json({ success: true, txHash: tx.hash, message: "Registro fechado." });
  } catch (error: any) {
    console.error("ERRO DETALHADO:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/eleicao/admin/abrir-votacao", async (req, res) => {
  try {
    const tx = await eleicaoContract.openVoting();
    await tx.wait();
    res
      .status(200)
      .json({ success: true, txHash: tx.hash, message: "Votação aberta." });
  } catch (error: any) {
    console.error("ERRO DETALHADO:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/eleicao/admin/fechar-votacao", async (req, res) => {
  try {
    const tx = await eleicaoContract.closeVoting();
    await tx.wait();
    res
      .status(200)
      .json({ success: true, txHash: tx.hash, message: "Votação fechada." });
  } catch (error: any) {
    console.error("ERRO DETALHADO:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- ADMIN: Registros ---
app.post("/eleicao/admin/registrar-eleitor", async (req, res) => {
  try {
    const { voterAddress } = req.body;
    if (!voterAddress || !ethers.isAddress(voterAddress)) {
      return res.status(400).json({
        success: false,
        error: "O 'voterAddress' é obrigatório e deve ser um endereço válido.",
      });
    }

    const tx = await eleicaoContract.registerVoter(voterAddress);
    await tx.wait();
    res.status(201).json({
      success: true,
      txHash: tx.hash,
      message: `Eleitor ${voterAddress} registrado.`,
    });
  } catch (error: any) {
    console.error("ERRO DETALHADO:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/eleicao/admin/adicionar-candidato", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ success: false, error: "O 'name' (nome) é obrigatório." });
    }

    const tx = await eleicaoContract.addCandidate(name);
    await tx.wait();
    res.status(201).json({
      success: true,
      txHash: tx.hash,
      message: `Candidato '${name}' adicionado.`,
    });
  } catch (error: any) {
    console.error("ERRO DETALHADO:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/eleicao/admin/definir-periodo", async (req, res) => {
  try {
    const { startTime, endTime } = req.body;
    if (startTime === undefined || endTime === undefined) {
      return res.status(400).json({
        success: false,
        error: "'startTime' e 'endTime' (timestamps Unix) são obrigatórios.",
      });
    }

    const tx = await eleicaoContract.setVotingPeriod(startTime, endTime);
    await tx.wait();
    res.status(200).json({
      success: true,
      txHash: tx.hash,
      message: "Período de votação definido.",
    });
  } catch (error: any) {
    console.error("ERRO DETALHADO:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- ROTA DE VOTAÇÃO (POST) ---
app.post("/eleicao/votar", async (req, res) => {
  try {
    // 1. A rota agora espera o ID do candidato E o endereço do eleitor
    const { candidateId, voterAddress } = req.body;

    if (candidateId === undefined || !voterAddress) {
      return res.status(400).json({
        success: false,
        error: "'candidateId' e 'voterAddress' são obrigatórios.",
      });
    }
    if (!ethers.isAddress(voterAddress)) {
      return res
        .status(400)
        .json({ success: false, error: "'voterAddress' inválido." });
    }

    const tx = await eleicaoContract.vote(voterAddress, candidateId);
    await tx.wait();

    res.status(200).json({
      success: true,
      txHash: tx.hash,
      message: `Voto computado para o candidato ${candidateId} pelo eleitor ${voterAddress}`,
    });
  } catch (error: any) {
    console.error("ERRO DETALHADO:", error.message);
    // Se o 'require' do contrato falhar (ex: "Eleitor ja votou"),
    // o erro.message conterá essa informação.
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Express rodando na porta ${PORT}`);
});
