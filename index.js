process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 1;

const TelegramBot = require("node-telegram-bot-api");
const { token } = require("./config/config.json");
const bot = new TelegramBot(token, { polling: true });

const stopwords = require("nltk-stopwords");
const portuguese = stopwords.load("portuguese");

const send = require("./database/send.json");
const problem = require("./database/problem.json");
const solicitation = require("./database/solicitation.json");
const confirmation = require("./database/confirmation.json");
const pack = require("./database/pack.json");

function context(msg) {
  let countSend = 0;
  let countproblem = 0;

  messageSplit = msg.split(" ");

  for (let index = 0; index < messageSplit.length; index++) {
    if (confirmation.init.includes(messageSplit[index])) return "confirmation";
    if (solicitation.init.includes(messageSplit[index])) return "solicitation";

    if (send.init.includes(messageSplit[index])) countSend += 1;
    if (problem.init.includes(messageSplit[index])) countproblem += 1;
  }

  if (countSend - countproblem > 0) return "send";
  else if (countSend - countproblem < 0) return "problem";
  else return "error";
}

let persona = {};

bot.on("callback_query", function(callbackQuery) {
  if(callbackQuery.data == "Sim") {

    
    return bot.sendMessage(
      callbackQuery.message.chat.id,
      "Um momento que já iremos lhe atender."
      );
    } else {
      delete persona[callbackQuery.message.chat.id]

      return bot.sendMessage(
        callbackQuery.message.chat.id,
        "Espero ter lhe ajudado, tenha um ótimo dia."
        );

        
    }
});

bot.on("message", (msg) => {
  if (msg.text == "/start")
    return bot.sendMessage(
      msg.chat.id,
      "Olá! Aqui é Aisha, tudo bem? Irei fazer seu atendimento hoje. Me conta, como posso ajudar você?"
    );

  if (persona[msg.chat.id] == undefined)
    persona[msg.chat.id] = {
      context: {
        init: false,
        queue: false,
        send: {
          init: false,
          start: false,
          location: false,
        },
        problem: {
          init: false,
          start: false,
        },
        interacion: 0,
      },
    };

  persona[msg.chat.id]["context"]["interacion"] += 1;

  const message = stopwords.remove(msg.text.toLowerCase(), portuguese);
  const contextMessage = context(message);

  if (persona[msg.chat.id]["context"]["queue"]) {
    let time = 9;

    return bot.sendMessage(
      msg.chat.id,
      `Um momento, logo você será atendido. Atualmente você é o ${time} da fila, tempo estimado de ${time} Minutos para atendimento.`
    );
  }

  if (persona[msg.chat.id]["context"]["send"]["start"]) {
    if (persona[msg.chat.id]["context"]["send"]["location"]) {
      return bot.sendMessage(
        msg.chat.id,
        `Um momento, logo você será atendido`
      );
    }

    if (pack.pending.includes(msg.text.toUpperCase())) {
      persona[msg.chat.id]["context"]["send"]["location"] = true;

      return bot.sendMessage(msg.chat.id, "Seu produto consta como entregue, gostaria de efetuar uma reclamação do mesmo?", {
        "reply_markup": {
          "resize_keyboard": true,
          "one_time_keyboard": true,
          "inline_keyboard": [
            [
              {
                "text": "Sim",
                "callback_data": "Sim"
              },
              {
                "text": "Não",
                "callback_data": "Não"
              }
            ]
          ]
        }
      });
    } else {
      return bot.sendMessage(
        msg.chat.id,
        `Código não localizado, favor verificar o código de rastreio novamente.`
      );
    }
  }

  if (persona[msg.chat.id]["context"]["problem"]["start"]) {
    if (persona[msg.chat.id]["context"]["problem"]["location"]) {
      return bot.sendMessage(
        msg.chat.id,
        `Aguarde um momento, logo você será atendido.`
      );
    }

    if (pack.delivered.includes(msg.text.toUpperCase())) {
      persona[msg.chat.id]["context"]["problem"]["location"] = true;

      return bot.sendMessage(
        msg.chat.id,
        `Por gentileza, aguarde um momento, um atendente ira dar atenção a seu atendimento.`
      );
    } else {
      return bot.sendMessage(
        msg.chat.id,
        `Código não localizado, favor verificar o código de rastreio novamente.`
      );
    }
  }

  try {
    switch (contextMessage) {
      case "confirmation":
        break;
      case "send":
        persona[msg.chat.id]["context"]["send"]["start"] = true;

        bot.sendMessage(
          msg.chat.id,
          `Não se preocupe, sua dúvida é muito comum, para melhor resolução, poderia me informa seu código de rastreio.`
        );
        break;
      case "problem":
        persona[msg.chat.id]["context"]["problem"]["start"] = true;

        bot.sendMessage(
          msg.chat.id,
          `Sinto muito que isso tenha acontecido com o sr/sra. Poderia por gentileza informa o codigo de rastreio do produto.`
        );
        break;
      case "solicitation":
        if (persona[msg.chat.id]["context"]["interacion"] < 3) {
          bot.sendMessage(
            msg.chat.id,
            `Um momento, estou verificando a melhor forma de atendê-lo.`
          );
        } else {
          persona[msg.chat.id]["context"]["queue"] = true;

          bot.sendMessage(
            msg.chat.id,
            `Um momento que irei te transferir para um atendente`
          );
        }
        break;
      default:
        persona[msg.chat.id]["context"]["interacion"] -= 1;

        bot.sendMessage(
          msg.chat.id,
          `Desculpe, Não consegui compreende-lo devidamente.`
        );
        break;
    }

    persona[msg.chat.id]["context"]["init"] = true;
    console.log({
      context: contextMessage,
      message: message,
    });
  } catch (error) {
    bot.sendMessage(
      msg.chat.id,
      `Eu não sei, Você gostaria de falar com o supervisor?`
    );
  }
});
