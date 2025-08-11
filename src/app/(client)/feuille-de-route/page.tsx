export default function FeuilleDeRoutePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Feuille de Route</h1>
        <p className="text-muted-foreground">
          Planification et jalons de votre projet.
        </p>
      </div>
      
      <div className="rounded-lg border bg-card p-6">
        <p className="text-center text-muted-foreground">
          Contenu à implémenter dans la Phase 2
        </p>
      </div>
    </div>
  );
}
