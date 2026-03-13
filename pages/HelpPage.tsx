import React, { useState } from 'react';
import { UserRole } from '../types';

interface Section {
  id: string;
  title: string;
  icon: string;
  adminOnly?: boolean;
  content: React.ReactNode;
}

const Badge: React.FC<{ color: string; text: string }> = ({ color, text }) => (
  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mr-1 ${color}`}>{text}</span>
);

const H3: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2 border-b border-slate-100 pb-1">{children}</h3>
);

const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm text-slate-600 mb-2 leading-relaxed">{children}</p>
);

const Li: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="text-sm text-slate-600 mb-1 flex gap-2">
    <span className="text-blue-400 shrink-0 mt-0.5">•</span>
    <span>{children}</span>
  </li>
);

const InfoBox: React.FC<{ color?: string; children: React.ReactNode }> = ({ color = 'blue', children }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    green: 'bg-green-50 border-green-200 text-green-800',
  };
  return (
    <div className={`text-sm p-3 rounded-lg border mb-3 ${colors[color]}`}>{children}</div>
  );
};

const sections: Section[] = [
  {
    id: 'intro',
    title: 'Introduction',
    icon: '🏠',
    content: (
      <>
        <P>
          <strong>BEEBOX LAON</strong> est l'application de gestion locative des boxes de stockage situés à Laon.
          Elle centralise la gestion des boxes, des locataires, des finances et des données ORPI en un seul outil.
        </P>
        <H3>Deux rôles utilisateurs</H3>
        <ul className="mb-3">
          <Li><Badge color="bg-purple-100 text-purple-800" text="ADMIN" /> Accès complet — finances, données ORPI, gestion des agents, administration.</Li>
          <Li><Badge color="bg-green-100 text-green-800" text="AGENT" /> Accès limité — consulter les boxes, ajouter et gérer les locataires de son portefeuille.</Li>
        </ul>
        <InfoBox color="blue">
          Les données sont synchronisées en temps réel via Firebase. Toute modification est immédiatement visible sur tous les appareils connectés.
        </InfoBox>
      </>
    ),
  },
  {
    id: 'boxes',
    title: 'Boxes',
    icon: '📦',
    content: (
      <>
        <P>La page <strong>Boxes</strong> affiche le plan visuel de tous les boxes, organisés par côté (Cour / Rue) et niveau (RDC / Niveau 1).</P>
        <H3>Statuts</H3>
        <ul className="mb-3">
          <Li><Badge color="bg-green-100 text-green-700" text="VACANT" /> Le box est libre et disponible à la location.</Li>
          <Li><Badge color="bg-blue-100 text-blue-700" text="OCCUPÉ" /> Le box est loué à un locataire actif.</Li>
          <Li><Badge color="bg-red-100 text-red-700" text="RETARD" /> Le locataire est en retard de paiement.</Li>
          <Li><Badge color="bg-yellow-100 text-yellow-800" text="TRAVAUX" /> Une intervention est signalée sur ce box.</Li>
        </ul>
        <H3>Cliquer sur un box</H3>
        <ul className="mb-3">
          <Li>Voir les détails : taille, prix, côté, niveau, type d'ouverture.</Li>
          <Li>Voir le locataire en cours et son statut de paiement.</Li>
          <Li>Accéder à l'historique des locataires passés.</Li>
          <Li>Modifier les informations du box (Admin uniquement).</Li>
          <Li>Signaler des travaux à faire et les marquer comme réalisés.</Li>
        </ul>
        <H3>Gestion avancée (Données & Admin)</H3>
        <ul className="mb-3">
          <Li>Tableau complet de tous les boxes avec filtres et tri.</Li>
          <Li>Modifier le nombre total de boxes (ajout/suppression).</Li>
          <Li>Export Excel de la liste des boxes.</Li>
        </ul>
      </>
    ),
  },
  {
    id: 'tenants',
    title: 'Locataires',
    icon: '👤',
    content: (
      <>
        <P>La page <strong>Locataires</strong> liste tous les locataires actifs et anciens avec filtres et tri.</P>
        <H3>Ajouter un locataire</H3>
        <ul className="mb-3">
          <Li>Cliquer sur <strong>+ Ajouter</strong> en haut à droite.</Li>
          <Li>Sélectionner le box à louer (seuls les boxes vacants sont proposés).</Li>
          <Li>Renseigner : nom, prénom, adresse, téléphone, email, code porte.</Li>
          <Li>Joindre le justificatif d'identité et le justificatif d'assurance.</Li>
          <Li>Renseigner la compagnie d'assurance, le montant et la <strong>date d'expiration</strong>.</Li>
          <Li>Définir la date d'entrée et la date de sortie potentielle.</Li>
        </ul>
        <H3>Modifier un locataire</H3>
        <ul className="mb-3">
          <Li>Cliquer sur <strong>Modifier</strong> dans la ligne du locataire.</Li>
          <Li>Tous les champs sont modifiables. L'admin peut également modifier les dates d'entrée/sortie réelles.</Li>
        </ul>
        <H3>Actions rapides</H3>
        <ul className="mb-3">
          <Li><strong>Rappel</strong> — Ouvre votre client email avec un message pré-rempli pour rappeler le locataire d'un paiement en retard.</Li>
          <Li><strong>Docs</strong> — Envoie le règlement intérieur et/ou le mandat de location par email (après upload des PDFs dans Administration).</Li>
        </ul>
        <H3>Statuts de paiement</H3>
        <ul className="mb-3">
          <Li><Badge color="bg-green-100 text-green-700" text="Payé" /> Paiement confirmé ce mois.</Li>
          <Li><Badge color="bg-yellow-100 text-yellow-800" text="À échéance" /> Montant mensuel à percevoir (statut par défaut).</Li>
          <Li><Badge color="bg-red-100 text-red-700" text="En retard" /> Échéance dépassée et non payée.</Li>
        </ul>
        <InfoBox color="amber">
          Le champ <strong>Impayé cumulé</strong> (unpaidRent) est synchronisé depuis les données ORPI via le bouton "Recalculer les impayés" dans Données & Admin.
        </InfoBox>
      </>
    ),
  },
  {
    id: 'finances',
    title: 'Finances',
    icon: '💶',
    adminOnly: true,
    content: (
      <>
        <P>La page <strong>Finances</strong> est réservée à l'Admin. Elle regroupe toutes les analyses financières.</P>
        <H3>Vue mensuelle</H3>
        <P>Sélectionner un mois pour voir : total quittancé, total réglé, impayés du mois, honoraires de gérance, net propriétaire.</P>
        <H3>Vue annuelle</H3>
        <P>Tableau récapitulatif par mois de l'année : virements, honoraires gérance, honoraires entrée. Source : fichiers RDG ORPI importés.</P>
        <H3>Honoraires</H3>
        <P>Tableau de toutes les factures d'honoraires ORPI avec filtre par locataire ou prestation.</P>
        <H3>Erreurs ORPI documentées</H3>
        <P>Liste des anomalies connues (tarifs erronés, dettes fantômes) avec impact mensuel et annuel calculé.</P>
        <H3>Alertes assurances</H3>
        <P>Locataires dont l'assurance expire dans les 60 jours. Rouge si expiré, orange si moins de 14 jours.</P>
        <H3>Alertes contrats & disponibilité</H3>
        <ul className="mb-3">
          <Li>Contrats se terminant dans 60 jours, triés par jours restants.</Li>
          <Li>Boxes actuellement vacants (disponibles immédiatement).</Li>
          <Li>Boxes bientôt libres (via les contrats expirants).</Li>
        </ul>
        <H3>Loyers en retard</H3>
        <P>Locataires actifs avec un retard de paiement, classés par numéro de box. Affiche le montant du retard et le nombre de jours de retard.</P>
        <H3>Bilan financier par locataire</H3>
        <P>Cumul depuis le début des données ORPI importées : total quittancé, total réglé, balance (vert = à jour, rouge = impayé cumulé).</P>
        <H3>Calculateur IRL</H3>
        <P>Calcule la révision de loyer selon l'Indice de Référence des Loyers INSEE. Entrez : loyer actuel, IRL de référence, nouvel IRL → résultat en temps réel.</P>
        <InfoBox color="blue">
          Les indices IRL sont publiés trimestriellement par l'INSEE. Lien disponible directement dans le calculateur.
        </InfoBox>
      </>
    ),
  },
  {
    id: 'crg',
    title: 'Contrôle CRG',
    icon: '📋',
    adminOnly: true,
    content: (
      <>
        <P>Le <strong>Contrôle CRG Mensuel</strong> est accessible dans l'onglet "Contrôle CRG" de la page Données & Admin.</P>
        <H3>Principe</H3>
        <P>Chaque mois, ORPI envoie par email un lien vers un PDF "Compte Rendu de Gérance". Ce PDF est analysé automatiquement par intelligence artificielle (Gemini Vision) pour vérifier les anomalies.</P>
        <H3>Utilisation</H3>
        <ul className="mb-3">
          <Li>Télécharger le PDF CRG depuis l'email ORPI.</Li>
          <Li>Cliquer sur <strong>Sélectionner le PDF CRG</strong> dans l'onglet Contrôle CRG.</Li>
          <Li>Cliquer sur <strong>Analyser le CRG</strong> — l'IA extrait les données de chaque lot.</Li>
          <Li>Le résultat compare automatiquement avec les erreurs documentées.</Li>
        </ul>
        <H3>Résultats affichés</H3>
        <ul className="mb-3">
          <Li><Badge color="bg-red-100 text-red-800" text="PERSISTANT" /> L'erreur est toujours présente ce mois.</Li>
          <Li><Badge color="bg-green-100 text-green-800" text="CORRIGÉ" /> L'erreur a été corrigée par l'agence.</Li>
          <Li><Badge color="bg-blue-100 text-blue-800" text="NOUVEAU" /> Une nouvelle anomalie détectée non documentée.</Li>
        </ul>
        <InfoBox color="amber">
          Nécessite une clé API Google Gemini configurée (variable d'environnement API_KEY).
        </InfoBox>
      </>
    ),
  },
  {
    id: 'data',
    title: 'Données & Admin',
    icon: '⚙️',
    adminOnly: true,
    content: (
      <>
        <P>Page réservée à l'Admin, accessible via le menu <strong>Données & Admin</strong>.</P>
        <H3>Onglet Statistiques</H3>
        <ul className="mb-3">
          <Li>KPIs globaux : taux d'occupation, revenus potentiels, revenus actuels.</Li>
          <Li>Graphique d'évolution mensuelle.</Li>
          <Li><strong>Recalculer les impayés</strong> : synchronise automatiquement le champ unpaidRent de chaque locataire depuis la dernière période ORPI importée.</Li>
          <Li>Téléchargement des rapports Excel (boxes, locataires, bilan).</Li>
        </ul>
        <H3>Onglet Contrôle CRG</H3>
        <P>Voir section "Contrôle CRG" ci-dessus.</P>
        <H3>Onglet Gestion des Boxes</H3>
        <ul className="mb-3">
          <Li>Tableau complet de tous les boxes avec filtres.</Li>
          <Li>Modifier le nombre total de boxes.</Li>
          <Li>Modifier les caractéristiques de chaque box directement dans le tableau.</Li>
        </ul>
        <H3>Onglet Administrateur</H3>
        <ul className="mb-3">
          <Li>Modifier le profil administrateur (nom, email, mot de passe).</Li>
          <Li><strong>Documents légaux</strong> : uploader le règlement intérieur et le mandat de location (PDF) vers Firebase Storage. Ces documents seront utilisés pour le bouton "Docs" sur les locataires.</Li>
          <Li><strong>Zone de danger</strong> : réinitialiser la base de données (irréversible).</Li>
        </ul>
        <H3>Import des données ORPI</H3>
        <ul className="mb-3">
          <Li>Les fichiers CSV de gérance (gerance_YYYY_MM.csv) s'importent via les scripts Python dans le dossier import_data.</Li>
          <Li>Les fichiers RDG Excel (Gerance_total.xlsx) s'importent via parse_rdg.py.</Li>
          <Li>Les fichiers d'honoraires (honoraires.csv) s'importent via parse_honoraires.py.</Li>
          <Li>Les PDFs CRG sont renommés automatiquement au format CRG_YYYY-MM.pdf par rename_crg.py.</Li>
        </ul>
      </>
    ),
  },
  {
    id: 'agency',
    title: 'Agences & Agents',
    icon: '🏢',
    adminOnly: true,
    content: (
      <>
        <P>Page réservée à l'Admin.</P>
        <H3>Agences</H3>
        <ul className="mb-3">
          <Li>Créer et gérer les agences partenaires (ORPI, etc.).</Li>
          <Li>Configurer les honoraires de gérance (%) et les frais d'entrée (€ fixe).</Li>
          <Li>Renseigner l'email de contact pour les rapports.</Li>
        </ul>
        <H3>Agents</H3>
        <ul className="mb-3">
          <Li>Créer des comptes agents avec leur code personnel et code porte.</Li>
          <Li>Chaque agent ne voit que les locataires de son portefeuille.</Li>
          <Li>Réinitialiser le mot de passe d'un agent.</Li>
        </ul>
      </>
    ),
  },
  {
    id: 'calendar',
    title: 'Historique',
    icon: '📅',
    adminOnly: true,
    content: (
      <>
        <P>La page <strong>Historique</strong> affiche le journal d'activité de l'application.</P>
        <ul className="mb-3">
          <Li>Toutes les actions sont enregistrées : connexions, modifications de locataires, mises à jour de boxes.</Li>
          <Li>Chaque entrée affiche : date/heure, utilisateur, rôle, description de l'action.</Li>
          <Li>Permet de tracer qui a fait quoi et quand.</Li>
        </ul>
      </>
    ),
  },
  {
    id: 'tips',
    title: 'Conseils pratiques',
    icon: '💡',
    content: (
      <>
        <H3>Flux mensuel recommandé</H3>
        <ol className="mb-3 space-y-1">
          {[
            'Recevoir le PDF CRG par email ORPI.',
            'Aller dans Données & Admin → Contrôle CRG → analyser le PDF.',
            'Vérifier les erreurs PERSISTANTES, noter les corrections effectuées.',
            'Recalculer les impayés (bouton bleu dans Statistiques).',
            'Consulter Finances → Loyers en retard → envoyer les rappels.',
            'Vérifier les alertes assurances et contrats dans Finances.',
          ].map((step, i) => (
            <li key={i} className="text-sm text-slate-600 flex gap-3">
              <span className="bg-blue-100 text-blue-700 font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <H3>Révision de loyer (IRL)</H3>
        <ul className="mb-3">
          <Li>Aller dans Finances → Calculateur IRL.</Li>
          <Li>Consulter le dernier indice sur le site INSEE (lien fourni dans l'outil).</Li>
          <Li>Entrer l'indice de référence du contrat et le dernier indice publié.</Li>
          <Li>Contacter ORPI pour mettre à jour le loyer dans leur système.</Li>
        </ul>
        <H3>Mise à jour des documents légaux</H3>
        <ul className="mb-3">
          <Li>Aller dans Données & Admin → Administrateur → Documents légaux.</Li>
          <Li>Uploader le règlement intérieur et le mandat de location (PDF).</Li>
          <Li>Le bouton "Docs" devient actif sur la liste des locataires.</Li>
          <Li>Cliquer sur "Docs" ouvre votre client email avec les liens de téléchargement.</Li>
        </ul>
        <InfoBox color="green">
          Les données ne sont jamais perdues : tout est sauvegardé en temps réel sur Firebase Firestore. En cas de problème, l'historique d'activité permet de tracer les modifications.
        </InfoBox>
      </>
    ),
  },
];

interface HelpPageProps {
  currentUserRole?: UserRole;
}

const HelpPage: React.FC<HelpPageProps> = ({ currentUserRole = UserRole.Admin }) => {
  const visibleSections = sections.filter(s => !s.adminOnly || currentUserRole === UserRole.Admin);
  const [activeSection, setActiveSection] = useState('intro');
  const current = visibleSections.find(s => s.id === activeSection) || visibleSections[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Guide d'utilisation — BEEBOX LAON</h1>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sommaire */}
        <div className="lg:w-56 shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sommaire</p>
            </div>
            <nav className="p-2 space-y-0.5">
              {visibleSections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    activeSection === s.id
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{s.icon}</span>
                  <span>{s.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span>{current.icon}</span>
            <span>{current.title}</span>
          </h2>
          <div>{current.content}</div>
          <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between text-xs text-slate-400">
            <span>BEEBOX LAON — Guide interne v2</span>
            <span>Mise à jour : mars 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
