//load_allies
setInterval(() => {
        let active_characters = get_active_characters()
        for (let name of partyMems) {
            if (name === character.name) continue;

            else if(!active_characters[name] && load_allies){
                start_character(name, "MAIN");
                game_log("Starting " + name);
            }
        }
    }, 10000);

const isOnline = (name) => {
    return parent.party_list.includes(name); // More reliable than get_player()
};