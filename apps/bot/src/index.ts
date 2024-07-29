import { Client, Events, GatewayIntentBits, TextChannel } from "discord.js";
import { e, instance } from "$lib/database";

import { DISCORD_TOKEN } from "$env";
import { Elysia } from "elysia";
import { cron } from "@elysiajs/cron";

const MAX_POINTS = 100;

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once(Events.ClientReady, (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (m) => {
    if (m.author.bot) return;

    if (m.content.startsWith("!leaderboard")) {
        let leaderboardQuery = e.select(e.User, (u) => ({
            discord_id: true,
            points: true,
            order_by: {
                expression: u.points,
                direction: e.DESC,
            },
            limit: e.int64(10),
        }));
        const leaderboard = await leaderboardQuery.run(instance);
        let message = "Leaderboard:\n";
        for (let i = 0; i < leaderboard.length; i++) {
            message += `${i + 1}. <@${leaderboard[i].discord_id}>: ${leaderboard[i].points} points\n`;
        }
        m.reply(message);
        return;
    }

    if (!m.content.toLowerCase().startsWith("gm")) return;

    await instance.transaction(async (tx) => {
        let insertOrSelectUserQuery = e
            .insert(e.User, {
                discord_id: e.str(m.author.id),
            })
            .unlessConflict((u) => ({
                on: u.discord_id,
                else: e.select(e.User),
            }));

        let userQuery = e.select(insertOrSelectUserQuery, (u) => ({
            discord_id: true,
            last_good_morning: true,
            last_good_night: true,
            streak: true,
            points: true,
            filter_single: e.op(u.discord_id, "=", e.str(m.author.id)),
        }));

        const user = await userQuery.run(tx);

        if (!user) throw new Error("User not found. This should never happen.");

        const currentTime = new Date();
        const targetTime = new Date();

        targetTime.setUTCHours(6, 0, 0, 0);

        if (targetTime > currentTime) {
            targetTime.setDate(targetTime.getDate() - 1);
        }

        if ((user.last_good_morning?.getTime() ?? 0) > targetTime.getTime()) {
            return;
        }

        let streak = user.streak + 1;

        const streakLoseTime = new Date(targetTime);

        streakLoseTime.setDate(streakLoseTime.getDate() - 1);

        if ((user.last_good_morning?.getTime() ?? currentTime.getTime()) < streakLoseTime.getTime()) {
            streak = 1;
        }

        const millisecondsDifference = currentTime.getTime() - targetTime.getTime();
        const minutesDifference = millisecondsDifference / 1000 / 60;
        const timeDifferenceInMinutes = Math.max(0, minutesDifference);

        let points = Math.ceil(Math.max(25, MAX_POINTS - MAX_POINTS * timeDifferenceInMinutes * 0.003));

        let updateQuery = e.update(e.User, (u) => ({
            filter_single: e.op(u.discord_id, "=", e.str(m.author.id)),
            set: {
                last_good_morning: e.datetime(currentTime),
                streak: e.int64(streak),
                points: e.int64(user.points + points),
            },
        }));

        await updateQuery.run(tx);

        m.reply(`Good morning! You have gained ${points} points! Your streak is now ${streak}.`);
    });
});

client.login(DISCORD_TOKEN);

new Elysia()
    .use(
        cron({
            name: "heartbeat",
            pattern: "0 14 * * *",
            run() {
                const channel: TextChannel = client.channels.cache.get("1248113350353879052")! as TextChannel;
                channel.send("Good morning <@everyone>, don't forget to say gm!").catch(console.error);
            },
        })
    )
    .listen(3000);
