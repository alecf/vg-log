import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button, Card, Input } from "@/components";

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
      <Button fullWidth size="lg" onClick={onCreateFamily}>
        Create a Family
      </Button>
      <Button fullWidth size="lg" variant="secondary" onClick={onJoinFamily}>
        Join a Family
      </Button>
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
      <Card padding="lg" className="space-y-4">
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
        <Button fullWidth onClick={handleContinue} disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Logging in…" : "Continue to Dashboard"}
        </Button>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} aria-label="Go back">
        ← Back
      </Button>
      <h2 className="text-xl font-semibold">Create a Family</h2>

      <Input
        label="Family Name"
        type="text"
        name="family-name"
        autoComplete="organization"
        value={familyName}
        onChange={(e) => setFamilyName(e.target.value)}
        placeholder="The Smith Family"
      />

      <Input
        label="Your Name"
        type="text"
        name="parent-name"
        autoComplete="name"
        value={parentName}
        onChange={(e) => setParentName(e.target.value)}
        placeholder="Mom / Dad"
      />

      <Input
        label="4-Digit PIN"
        variant="pin"
        type="password"
        name="pin"
        autoComplete="new-password"
        inputMode="numeric"
        maxLength={4}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        placeholder="****"
      />

      {createFamily.error && (
        <p className="text-sm text-exceeded">{createFamily.error.message}</p>
      )}

      <Button
        fullWidth
        onClick={handleCreate}
        disabled={!familyName || !parentName || pin.length !== 4 || createFamily.isPending}
      >
        {createFamily.isPending ? "Creating…" : "Create Family"}
      </Button>
    </Card>
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
    <Card padding="lg" className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} aria-label="Go back">
        ← Back
      </Button>
      <h2 className="text-xl font-semibold">Join a Family</h2>

      <Input
        label="Invite Code"
        type="text"
        name="invite-code"
        autoComplete="off"
        spellCheck={false}
        value={inviteCode}
        onChange={(e) => {
          setInviteCode(e.target.value.toUpperCase().slice(0, 6));
          setError("");
        }}
        placeholder="ABC123"
        className="uppercase"
        variant="pin"
      />

      {inviteCode.length === 6 && checkCode.data && (
        <p className="text-sm text-ok">Found: {checkCode.data.familyName}</p>
      )}

      {codeAlreadyUsed && (
        <p className="text-sm text-warning">
          You've already used this code on this device. Select your name below to log in.
        </p>
      )}

      {error && <p className="text-sm text-exceeded">{error}</p>}

      <Button
        fullWidth
        onClick={handleSubmit}
        disabled={inviteCode.length !== 6 || !checkCode.data}
      >
        Continue
      </Button>
    </Card>
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
  const navigate = useNavigate();
  const { isCodeUsed, markCodeAsUsed, login } = useAuthStore();
  const { data } = trpc.auth.getFamilyMembers.useQuery({ inviteCode });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");

  // Determine role from code type
  const expectedRole = data?.codeType === "parent" ? "parent" : "child";
  const codeAlreadyUsed = isCodeUsed(inviteCode);

  // Filter members to only show those matching the code type
  const filteredMembers = data?.members.filter((m) => m.role === expectedRole) ?? [];

  // Login mutation for after joining
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

  const joinFamily = trpc.family.join.useMutation({
    onSuccess: (result) => {
      markCodeAsUsed(inviteCode);
      // Log in directly with the PIN they just set
      loginMutation.mutate({ oderId: result.oderId, pin: newPin });
    },
  });

  if (isAddingNew) {
    // Check if this code has already been used for a new account
    if (codeAlreadyUsed) {
      return (
        <Card padding="lg" className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setIsAddingNew(false)} aria-label="Go back">
            ← Back
          </Button>
          <h2 className="text-xl font-semibold">Already Used</h2>
          <p className="text-muted-foreground">
            This invite code has already been used to create an account on this device.
            Please select your existing account or ask a parent for a new code.
          </p>
        </Card>
      );
    }

    return (
      <Card padding="lg" className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setIsAddingNew(false)} aria-label="Go back">
          ← Back
        </Button>
        <h2 className="text-xl font-semibold">Join {data?.familyName}</h2>

        <Input
          label="Your Name"
          type="text"
          name="member-name"
          autoComplete="name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Your name"
        />

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">
            You're joining as: <span className="font-medium capitalize">{expectedRole}</span>
          </p>
        </div>

        <Input
          label="Create a 4-Digit PIN"
          hint="You'll use this to log in"
          variant="pin"
          type="password"
          name="new-pin"
          autoComplete="new-password"
          inputMode="numeric"
          maxLength={4}
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
          placeholder="****"
        />

        {(joinFamily.error || loginMutation.error) && (
          <p className="text-sm text-exceeded">
            {joinFamily.error?.message || loginMutation.error?.message}
          </p>
        )}

        <Button
          fullWidth
          onClick={() =>
            joinFamily.mutate({
              inviteCode,
              name: newName,
              role: expectedRole,
              pin: newPin,
            })
          }
          disabled={!newName || newPin.length !== 4 || joinFamily.isPending || loginMutation.isPending}
        >
          {joinFamily.isPending || loginMutation.isPending ? "Joining…" : "Join Family"}
        </Button>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} aria-label="Go back">
        ← Back
      </Button>
      <h2 className="text-xl font-semibold">Who are you?</h2>
      <p className="text-sm text-muted-foreground">{data?.familyName}</p>

      {filteredMembers.length > 0 && (
        <div className="space-y-2">
          {filteredMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => onSelectMember(member)}
              className="w-full rounded-lg bg-muted border border-border p-4 text-left hover:bg-muted/80 transition"
            >
              <p className="font-medium">{member.name}</p>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setIsAddingNew(true)}
        className="w-full rounded-lg border border-dashed border-border p-4 text-muted-foreground hover:text-foreground hover:border-foreground transition"
      >
        + I'm new here
      </button>
    </Card>
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
    <Card padding="lg" className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} aria-label="Go back">
        ← Back
      </Button>
      <h2 className="text-xl font-semibold">Hi, {member.name}!</h2>
      <p className="text-sm text-muted-foreground">Enter your PIN to continue</p>

      <Input
        variant="pin"
        type="password"
        name="login-pin"
        autoComplete="current-password"
        inputMode="numeric"
        maxLength={4}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        placeholder="****"
        autoFocus
        className="text-3xl"
      />

      {loginMutation.error && (
        <p className="text-sm text-exceeded">Wrong PIN, try again</p>
      )}

      <Button
        fullWidth
        onClick={() => loginMutation.mutate({ oderId: member.id, pin })}
        disabled={pin.length !== 4 || loginMutation.isPending}
      >
        {loginMutation.isPending ? "Logging in…" : "Login"}
      </Button>
    </Card>
  );
}
