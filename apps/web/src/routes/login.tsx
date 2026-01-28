import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  component: Login,
});

type Step = "choose" | "create" | "join" | "select-member" | "enter-pin";

function Login() {
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<Step>("choose");
  const [inviteCode, setInviteCode] = useState("");
  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    name: string;
    role: string;
  } | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">VG-Log</h1>
          <p className="text-muted-foreground mt-2">Family Gaming Time Tracker</p>
        </div>

        {step === "choose" && (
          <ChooseStep onCreateFamily={() => setStep("create")} onJoinFamily={() => setStep("join")} />
        )}

        {step === "create" && (
          <CreateFamilyStep onBack={() => setStep("choose")} />
        )}

        {step === "join" && (
          <JoinFamilyStep
            inviteCode={inviteCode}
            setInviteCode={setInviteCode}
            onBack={() => setStep("choose")}
            onCodeValid={() => setStep("select-member")}
          />
        )}

        {step === "select-member" && (
          <SelectMemberStep
            inviteCode={inviteCode}
            onBack={() => setStep("join")}
            onSelectMember={(member) => {
              setSelectedMember(member);
              setStep("enter-pin");
            }}
          />
        )}

        {step === "enter-pin" && selectedMember && (
          <EnterPinStep
            member={selectedMember}
            onBack={() => setStep("select-member")}
          />
        )}
      </div>
    </div>
  );
}

function ChooseStep({
  onCreateFamily,
  onJoinFamily,
}: {
  onCreateFamily: () => void;
  onJoinFamily: () => void;
}) {
  return (
    <div className="space-y-4">
      <button
        onClick={onCreateFamily}
        className="w-full rounded-xl bg-primary p-4 text-primary-foreground font-medium hover:bg-primary/90 transition"
      >
        Create a Family
      </button>
      <button
        onClick={onJoinFamily}
        className="w-full rounded-xl bg-card border border-border p-4 font-medium hover:bg-muted transition"
      >
        Join a Family
      </button>
    </div>
  );
}

function CreateFamilyStep({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [familyName, setFamilyName] = useState("");
  const [parentName, setParentName] = useState("");
  const [pin, setPin] = useState("");
  const [createdCodes, setCreatedCodes] = useState<{
    childCode: string;
    parentCode: string;
  } | null>(null);

  const createFamily = trpc.family.create.useMutation({
    onSuccess: (data) => {
      setCreatedCodes({
        childCode: data.childInviteCode,
        parentCode: data.parentInviteCode,
      });
    },
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      login(
        {
          id: data.user.id,
          name: data.user.name,
          role: data.user.role,
          familyId: data.user.familyId,
        },
        {
          id: data.family.id,
          name: data.family.name,
          timezone: data.family.timezone,
        }
      );
      navigate({ to: "/" });
    },
  });

  const handleCreate = () => {
    createFamily.mutate({
      name: familyName,
      parentName,
      parentPin: pin,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  const handleContinue = () => {
    if (createFamily.data) {
      loginMutation.mutate({
        oderId: createFamily.data.oderId,
        pin,
      });
    }
  };

  if (createdCodes) {
    return (
      <div className="space-y-4 rounded-xl bg-card p-6">
        <h2 className="text-xl font-semibold">Family Created!</h2>

        <div className="space-y-3">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground mb-1">Child Invite Code</p>
            <p className="text-2xl font-mono font-bold tracking-wider">{createdCodes.childCode}</p>
            <p className="text-xs text-muted-foreground mt-1">Share with your kids</p>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground mb-1">Parent Invite Code</p>
            <p className="text-2xl font-mono font-bold tracking-wider">{createdCodes.parentCode}</p>
            <p className="text-xs text-muted-foreground mt-1">Share with other parents only</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          You can view these codes anytime in Family Settings.
        </p>
        <button
          onClick={handleContinue}
          disabled={loginMutation.isPending}
          className="w-full rounded-lg bg-primary p-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loginMutation.isPending ? "Logging in..." : "Continue to Dashboard"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl bg-card p-6">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back
      </button>
      <h2 className="text-xl font-semibold">Create a Family</h2>

      <div>
        <label className="block text-sm font-medium mb-1">Family Name</label>
        <input
          type="text"
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          placeholder="The Smith Family"
          className="w-full rounded-lg bg-muted border border-border p-3 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Your Name</label>
        <input
          type="text"
          value={parentName}
          onChange={(e) => setParentName(e.target.value)}
          placeholder="Mom / Dad"
          className="w-full rounded-lg bg-muted border border-border p-3 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">4-Digit PIN</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="****"
          className="w-full rounded-lg bg-muted border border-border p-3 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {createFamily.error && (
        <p className="text-sm text-exceeded">{createFamily.error.message}</p>
      )}

      <button
        onClick={handleCreate}
        disabled={
          !familyName || !parentName || pin.length !== 4 || createFamily.isPending
        }
        className="w-full rounded-lg bg-primary p-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {createFamily.isPending ? "Creating..." : "Create Family"}
      </button>
    </div>
  );
}

function JoinFamilyStep({
  inviteCode,
  setInviteCode,
  onBack,
  onCodeValid,
}: {
  inviteCode: string;
  setInviteCode: (code: string) => void;
  onBack: () => void;
  onCodeValid: () => void;
}) {
  const { isCodeUsed } = useAuthStore();
  const [error, setError] = useState("");

  const checkCode = trpc.auth.getFamilyMembers.useQuery(
    { inviteCode },
    { enabled: inviteCode.length === 6 }
  );

  const codeAlreadyUsed = inviteCode.length === 6 && isCodeUsed(inviteCode);

  const handleSubmit = () => {
    if (checkCode.data) {
      onCodeValid();
    } else if (checkCode.error) {
      setError("Invalid invite code");
    }
  };

  return (
    <div className="space-y-4 rounded-xl bg-card p-6">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back
      </button>
      <h2 className="text-xl font-semibold">Join a Family</h2>

      <div>
        <label className="block text-sm font-medium mb-1">Invite Code</label>
        <input
          type="text"
          value={inviteCode}
          onChange={(e) => {
            setInviteCode(e.target.value.toUpperCase().slice(0, 6));
            setError("");
          }}
          placeholder="ABC123"
          className="w-full rounded-lg bg-muted border border-border p-3 text-center text-2xl tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {inviteCode.length === 6 && checkCode.data && (
        <p className="text-sm text-ok">Found: {checkCode.data.familyName}</p>
      )}

      {codeAlreadyUsed && (
        <p className="text-sm text-warning">
          You've already used this code on this device. Select your name below to log in.
        </p>
      )}

      {error && <p className="text-sm text-exceeded">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={inviteCode.length !== 6 || !checkCode.data}
        className="w-full rounded-lg bg-primary p-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        Continue
      </button>
    </div>
  );
}

function SelectMemberStep({
  inviteCode,
  onBack,
  onSelectMember,
}: {
  inviteCode: string;
  onBack: () => void;
  onSelectMember: (member: { id: string; name: string; role: string }) => void;
}) {
  const { isCodeUsed, markCodeAsUsed } = useAuthStore();
  const { data } = trpc.auth.getFamilyMembers.useQuery({ inviteCode });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");

  // Determine role from code type
  const expectedRole = data?.codeType === "parent" ? "parent" : "child";
  const codeAlreadyUsed = isCodeUsed(inviteCode);

  const joinFamily = trpc.family.join.useMutation({
    onSuccess: (result) => {
      markCodeAsUsed(inviteCode);
      onSelectMember({
        id: result.oderId,
        name: newName,
        role: expectedRole,
      });
    },
  });

  if (isAddingNew) {
    // Check if this code has already been used for a new account
    if (codeAlreadyUsed) {
      return (
        <div className="space-y-4 rounded-xl bg-card p-6">
          <button
            onClick={() => setIsAddingNew(false)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back
          </button>
          <h2 className="text-xl font-semibold">Already Used</h2>
          <p className="text-muted-foreground">
            This invite code has already been used to create an account on this device.
            Please select your existing account or ask a parent for a new code.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4 rounded-xl bg-card p-6">
        <button
          onClick={() => setIsAddingNew(false)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back
        </button>
        <h2 className="text-xl font-semibold">Join {data?.familyName}</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Your Name</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg bg-muted border border-border p-3 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">
            You're joining as: <span className="font-medium capitalize">{expectedRole}</span>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">4-Digit PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
            placeholder="****"
            className="w-full rounded-lg bg-muted border border-border p-3 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {joinFamily.error && (
          <p className="text-sm text-exceeded">{joinFamily.error.message}</p>
        )}

        <button
          onClick={() =>
            joinFamily.mutate({
              inviteCode,
              name: newName,
              role: expectedRole,
              pin: newPin,
            })
          }
          disabled={!newName || newPin.length !== 4 || joinFamily.isPending}
          className="w-full rounded-lg bg-primary p-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {joinFamily.isPending ? "Joining..." : "Join Family"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl bg-card p-6">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back
      </button>
      <h2 className="text-xl font-semibold">Who are you?</h2>
      <p className="text-sm text-muted-foreground">{data?.familyName}</p>

      <div className="space-y-2">
        {data?.members.map((member) => (
          <button
            key={member.id}
            onClick={() => onSelectMember(member)}
            className="w-full rounded-lg bg-muted border border-border p-4 text-left hover:bg-muted/80 transition"
          >
            <p className="font-medium">{member.name}</p>
            <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
          </button>
        ))}
      </div>

      <button
        onClick={() => setIsAddingNew(true)}
        className="w-full rounded-lg border border-dashed border-border p-4 text-muted-foreground hover:text-foreground hover:border-foreground transition"
      >
        + I'm new here
      </button>
    </div>
  );
}

function EnterPinStep({
  member,
  onBack,
}: {
  member: { id: string; name: string; role: string };
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [pin, setPin] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      login(
        {
          id: data.user.id,
          name: data.user.name,
          role: data.user.role,
          familyId: data.user.familyId,
        },
        {
          id: data.family.id,
          name: data.family.name,
          timezone: data.family.timezone,
        }
      );
      navigate({ to: "/" });
    },
  });

  return (
    <div className="space-y-4 rounded-xl bg-card p-6">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back
      </button>
      <h2 className="text-xl font-semibold">Hi, {member.name}!</h2>
      <p className="text-sm text-muted-foreground">Enter your PIN to continue</p>

      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        placeholder="****"
        autoFocus
        className="w-full rounded-lg bg-muted border border-border p-4 text-center text-3xl tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
      />

      {loginMutation.error && (
        <p className="text-sm text-exceeded">Wrong PIN, try again</p>
      )}

      <button
        onClick={() => loginMutation.mutate({ oderId: member.id, pin })}
        disabled={pin.length !== 4 || loginMutation.isPending}
        className="w-full rounded-lg bg-primary p-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {loginMutation.isPending ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}
