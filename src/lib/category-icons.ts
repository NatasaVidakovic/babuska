export type CategoryIconKind =
  | "coffee"
  | "tea"
  | "wine"
  | "cocktail"
  | "juice"
  | "water"
  | "beer"
  | "cider"
  | "gelato"
  | "rakija"
  | "spirits"
  | "glass";

export function categoryIconKind(category: string): CategoryIconKind {
  const name = category.toLocaleLowerCase();
  if (/(коктел|коктейл|cocktail)/.test(name)) return "cocktail";
  if (/(вод[аеоиу]|вода|water)/.test(name)) return "water";
  if (/(сок|juice|хладн|холодн|cold)/.test(name)) return "juice";
  if (/(цидер|сајдер|cider)/.test(name)) return "cider";
  if (/(сладолед|морожен|гелато|gelato|ice cream)/.test(name)) return "gelato";
  if (/(пиво|beer)/.test(name)) return "beer";
  if (/(чај|чай|tea|инфуз|infusion)/.test(name)) return "tea";
  if (/(ракиј|schnapps)/.test(name)) return "rakija";
  if (
    /(ликер|liqueur|виски|whisky|whiskey|bourbon|вотка|водка|vodka|текил|tequila|џин|джин|gin|рум|rum|жесток|крепк|spirit)/.test(
      name,
    )
  )
    return "spirits";
  if (/(вино|вина|wine|шампан|игрист)/.test(name)) return "wine";
  if (/(каф|коф|espresso|cappuccino|latte|warm drink)/.test(name))
    return "coffee";
  return "glass";
}
