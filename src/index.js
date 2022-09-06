const { default: axios } = require("axios");
const fs = require("fs");
require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const LocalSession = require("telegraf-session-local");
const { steps } = require("./constants");
const { messages, buttons } = require("./messages");
const writeAnswers = require("./writeAnswers");

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(new LocalSession({ database: "session.json" }).middleware());

const renderButtons = (buttons) => {
  return Markup.inlineKeyboard(
    buttons.map((button) => {
      return [Markup.button.callback(button.title, button.id)];
    })
  );
};

bot.start(async (ctx) => {
  ctx.session.current_step = steps.EXTRA_INFO;
  ctx.session.userData = { id: ctx.message.from.id, telegram_username: ctx.message.from?.username };

  return ctx.replyWithHTML(messages.extraInfo, renderButtons(buttons.extraInfo));
});

bot.on("message", async (ctx) => {
  if (ctx.session.current_step === steps.HOW_KNOW_ABOUT_US) {
    ctx.session.current_step = steps.ABOUT_ME;
    ctx.session.userData.source = ctx.update.message.text;

    return ctx.reply(messages.aboutMe);
  }

  if (ctx.session.current_step === steps.ABOUT_ME) {
    if (ctx.update.message.text.length < 200) {
      return ctx.reply(messages.tellMore);
    } else {
      ctx.session.current_step = steps.CHECK_RAM;
      ctx.session.userData.about_me = ctx.update.message.text;

      return ctx.reply(messages.checkRam, renderButtons(buttons.checkRam));
    }
  }

  if (ctx.session.current_step === steps.CHECK_RAM) {
    const getFilePath = async () => {
      try {
        const fileId = ctx.update.message.photo?.[2]?.file_id;
        const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${fileId}`;
        const { data } = await axios(url);
        return data?.result?.file_path;
      } catch (e) {
        // ...
      }
    };

    const getDownloadLink = async () => {
      try {
        const filePath = await getFilePath();
        const downloadLink = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
        return downloadLink;
      } catch (e) {
        // ...
      }
    };

    if (ctx.update.message.photo !== undefined) {
      ctx.session.current_step = steps.EXPERIENCE;

      ctx.session.userData.check_ram = await getDownloadLink();
      return ctx.reply(messages.experience, renderButtons(buttons.experience));
    } else {
      return ctx.reply(messages.incorrectTypePhoto);
    }
  }

  if (ctx.session.current_step === steps.EXTRA_INFO_ABOUT_EXPERIENCE) {
    ctx.session.current_step = steps.ENGLISH_LVL;
    ctx.session.userData.experience = ctx.update.message.text;

    return ctx.reply(messages.englishLvl, renderButtons(buttons.englishLvl));
  }

  if (ctx.session.current_step === steps.TEST) {
    ctx.session.current_step = steps.SALARY;
    ctx.session.userData.test = ctx.update.message.text;

    // await ctx.replyWithPhoto({ source: "./img/salary.png" });
    return ctx.reply(messages.salary, renderButtons(buttons.salary));
  }
});

const onClickButton = (id, title) => {
  bot.action(id, async (ctx) => {
    try {
      await ctx.answerCbQuery();

      if (ctx.session.current_step === steps.EXTRA_INFO) {
        ctx.session.current_step = steps.HOW_KNOW_ABOUT_US;

        if (id.includes("success")) return ctx.reply(messages.howKnowAboutUs);
        if (id.includes("failed")) {
          ctx.session.current_step = steps.FINISH;
          return ctx.reply(messages.lastMessage);
        }
      }

      if (ctx.session.current_step === steps.CHECK_RAM) {
        if (id.includes("failed")) return ctx.reply(messages.lastMessage);
      }

      if (ctx.session.current_step === steps.EXPERIENCE) {
        if (id.includes("extraInfoAboutExperience")) {
          ctx.session.current_step = steps.EXTRA_INFO_ABOUT_EXPERIENCE;
          return ctx.reply(messages.extraInfoAboutExperience);
        }

        ctx.session.current_step = steps.ENGLISH_LVL;
        ctx.session.userData.experience = title;

        // await ctx.replyWithPhoto({ source: "./img/english_lvl.png" });
        return ctx.reply(messages.englishLvl, renderButtons(buttons.englishLvl));
      }

      if (ctx.session.current_step === steps.ENGLISH_LVL) {
        ctx.session.current_step = steps.READY_TO_WORK;
        ctx.session.userData.english_lvl = id;

        return ctx.reply(messages.readyToWork, renderButtons(buttons.readyToWork));
      }

      if (ctx.session.current_step === steps.READY_TO_WORK) {
        ctx.session.current_step = steps.TEST;

        if (id.includes("success")) {
          // await ctx.replyWithPhoto({ source: "./img/test.png" });
          return ctx.reply(messages.test);
        }
        if (id.includes("failed")) {
          ctx.session.current_step = steps.FINISH;
          return ctx.reply(messages.lastMessage);
        }
      }

      if (ctx.session.current_step === steps.SALARY) {
        ctx.session.current_step = steps.PRIORITIES;
        ctx.session.userData.salary = id;

        return ctx.reply(messages.priorities, renderButtons(buttons.priorities));
      }

      if (ctx.session.current_step === steps.PRIORITIES) {
        ctx.session.current_step = steps.FINISH;
        ctx.session.userData.priorities = title;

        await writeAnswers.writeData(ctx.session.userData);
        return ctx.reply(messages.finish);
      }

      // ...
      if (ctx.session.current_step === steps.FINISH) {
        return bot.stop();
      }
    } catch (error) {
      // ...
    }
  });
};

// Handle clicks
buttons.extraInfo.forEach((buttons) => onClickButton(buttons.id, buttons.title));
buttons.checkRam.forEach((buttons) => onClickButton(buttons.id, buttons.title));
buttons.experience.forEach((buttons) => onClickButton(buttons.id, buttons.title));
buttons.englishLvl.forEach((buttons) => onClickButton(buttons.id, buttons.title));
buttons.readyToWork.forEach((buttons) => onClickButton(buttons.id, buttons.title));
buttons.salary.forEach((buttons) => onClickButton(buttons.id, buttons.title));
buttons.priorities.forEach((buttons) => onClickButton(buttons.id, buttons.title));

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
