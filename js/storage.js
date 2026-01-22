function checkDailyCredits(user) {
    const today = new Date().toDateString();
    
    // Legacy support: ensure credits exist if undefined
    if (typeof user.credits === 'undefined') {
        user.credits = 0; // Initialize at 0, logic below will top it up
    }

    // If it's a new day
    if (user.lastLogin !== today) {
        // OPTION 1: Top up to 8 only if they are below 8
        if (user.credits < 8) {
            user.credits = 8;
        }
        // OPTION 2: Add 8 credits as a daily bonus (accumulative)
        // user.credits += 8; 

        user.lastLogin = today;
    }
    return user;
}
