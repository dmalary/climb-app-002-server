export const seedMockData = async (userId, supabase) => {
  // 3️⃣ Seed starter data
  // Boards
  const boardData = [
    { name: "MoonBoard" },
    { name: "Tension Board" },
    { name: "System Board" },
  ];
  const { data: boards } = await supabase.from("boards").insert(boardData).select("*");

  // Sessions (4 per user, static)
  const sessionData = [
    { user_id: userId, board_id: boards[0].id, date: new Date(), },
    { user_id: userId, board_id: boards[1].id, date: new Date(), },
    { user_id: userId, board_id: boards[0].id, date: new Date(), },
    { user_id: userId, board_id: boards[2].id, date: new Date(), },
  ];
  const { data: sessions } = await supabase.from("sessions").insert(sessionData).select("*");

  // Climbs (5 per session, static)
  const climbData = [];
  sessions.forEach((session, i) => {
    for (let j = 1; j <= 5; j++) {
      climbData.push({
        board_id: session.board_id,
        climb_name: `Climb ${i + 1}-${j}`,
        angle: 40,
        displayed_grade: "V2",
        difficulty: 10,
        is_benchmark: false,
      });
    }
  });
  const { data: climbs } = await supabase.from("climbs").insert(climbData).select("*");

  // Attempts (1 per climb, static)
  const attemptData = [];
  sessions.forEach((session, i) => {
    climbs
      .filter(c => c.board_id === session.board_id)
      .forEach(climb => {
        attemptData.push({
          session_id: session.id,
          climb_id: climb.id,
          tries: 1,
          is_repeat: false,
          is_ascent: false,
          is_mirror: false,
          comment: "",
        });
      });
  });
  await supabase.from("attempts").insert(attemptData);

  // Follower (first user follows a demo account if exists)
  const { data: otherUsers } = await supabase
    .from("users")
    .select("id")
    .neq("id", userId)
    .limit(1);
  if (otherUsers?.length) {
    await supabase.from("user_follows").insert({
      follower_id: userId,
      followee_id: otherUsers[0].id,
    });
  }
};