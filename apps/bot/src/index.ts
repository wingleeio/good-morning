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

    console.log(`Message received from ${m.author.tag}: ${m.content}`);

    if (m.content.startsWith("!leaderboard")) {
        console.log("!leaderboard command received");

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
        console.log("Leaderboard query result:", leaderboard);

        let message = "Leaderboard:\n";
        for (let i = 0; i < leaderboard.length; i++) {
            message += `${i + 1}. <@${leaderboard[i].discord_id}>: ${leaderboard[i].points} points\n`;
        }

        m.reply(message);
        console.log("Leaderboard message sent");
        return;
    }

    if (!m.content.toLowerCase().startsWith("gm")) return;

    console.log("gm command received");

    await instance.transaction(async (tx) => {
        console.log("Starting transaction");

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
        console.log("User query result:", user);

        if (!user) throw new Error("User not found. This should never happen.");

        const currentTime = new Date();
        console.log("Current time:", currentTime);

        const targetTime = new Date();
        targetTime.setUTCHours(13, 0, 0, 0);
        console.log("Target time (13:00 UTC):", targetTime);

        if (targetTime.getTime() > currentTime.getTime()) {
            targetTime.setUTCDate(targetTime.getUTCDate() - 1);
        }

        console.log("Adjusted target time:", targetTime);

        if ((user.last_good_morning?.getTime() ?? 0) > targetTime.getTime()) {
            console.log("Good morning already sent today");
            return;
        }

        let streak = user.streak + 1;
        console.log("Current streak:", streak);

        const streakLoseTime = new Date(targetTime);
        streakLoseTime.setUTCDate(streakLoseTime.getUTCDate() - 1);
        console.log("Streak lose time:", streakLoseTime);

        if ((user.last_good_morning?.getTime() ?? currentTime.getTime()) < streakLoseTime.getTime()) {
            streak = 1;
            console.log("Streak reset to 1");
        }

        const millisecondsDifference = currentTime.getTime() - targetTime.getTime();
        const minutesDifference = millisecondsDifference / 1000 / 60;
        const timeDifferenceInMinutes = Math.max(0, minutesDifference);
        console.log("Time difference in minutes:", timeDifferenceInMinutes);

        let points = Math.ceil(Math.max(25, MAX_POINTS - MAX_POINTS * timeDifferenceInMinutes * 0.003));
        console.log("Points to be awarded:", points);

        let updateQuery = e.update(e.User, (u) => ({
            filter_single: e.op(u.discord_id, "=", e.str(m.author.id)),
            set: {
                last_good_morning: e.datetime(currentTime),
                streak: e.int64(streak),
                points: e.int64(user.points + points),
            },
        }));

        await updateQuery.run(tx);
        console.log("User updated with new streak and points");

        m.reply(`Good morning! You have gained ${points} points! Your streak is now ${streak}.`);
        console.log("Reply sent to user");
    });
});

client.login(DISCORD_TOKEN);

new Elysia()
    .use(
        cron({
            name: "heartbeat",
            pattern: "0 13 * * *",
            run() {
                console.log("Running heartbeat cron job");
                const channel: TextChannel = client.channels.cache.get("1248113350353879052")! as TextChannel;
                channel.send("Good morning <@everyone>, don't forget to say gm!").catch(console.error);
                console.log("Heartbeat message sent");
            },
        })
    )
    .listen(3000, () => {
        console.log("Elysia server is listening on port 3000");
    });
