module default {
    abstract type Base {
        required created_at: datetime {
            default := datetime_current();
            readonly := true;
        };
        required updated_at: datetime {
            default := datetime_current();
            rewrite insert using (datetime_of_statement());
            rewrite update using (datetime_of_statement());
        };
    }

    type User extending Base {
        required discord_id: str {
            constraint exclusive;
        };
        last_good_morning: datetime;
        last_good_night: datetime;
        required points: int64 {
            default := 0;
        };
        required streak: int64 {
            default := 0;
        };
    }
}
